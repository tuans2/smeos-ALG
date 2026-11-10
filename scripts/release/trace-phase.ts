import { existsSync, readdirSync, statSync } from "node:fs"
import path from "node:path"

import { bestMatch, dirToPattern } from "../../src/lib/delivery/route-match"
import { apiReferences, importSpecifiers, linkReferences, readSource, resolveImport, routesForRef } from "./trace-imports"

/**
 * Dò phạm vi một giai đoạn bàn giao từ manifest (Bước 2.3, 2.5): từ trang và API được giao, đi theo import
 * và chuỗi `/api/...` tới khi không thêm gì. Kết quả dùng cho chế độ giai đoạn (`gd1.routes.json`) và cho
 * công cụ cắt repo.
 */
export interface PhaseManifest {
  phase: string
  features: { id: string; pages: string[]; apis: string[] }[]
  framework: { pages: string[] }[]
  excluded: { pages: string[] }[]
  frameworkRoutes: { routes: string[] }[]
  excludedApis: { prefixes: string[] }[]
  rootFiles: string[]
  registryFiles: { files: string[] }
  /** Phụ thuộc vào vùng không giao đã được ghi nhận, dạng `từ → tới`. */
  acceptedViolations: { items: string[] }[]
}

export interface Violation {
  /** Tệp trong phạm vi giao. */
  from: string
  /** Tệp thuộc trang không giao, hoặc API bị loại. */
  to: string
}

export interface PhaseTrace {
  pages: string[]
  apis: string[]
  blockedPages: string[]
  blockedApis: string[]
  /** Mọi tệp trong `src/` mà bản giao cần. */
  files: string[]
  /** Tệp trong `src/` (trừ test) không thuộc bản giao. */
  droppedFiles: string[]
  violations: Violation[]
  /** Liên kết viết cứng tới trang không giao — người dùng bấm sẽ gặp 404 (Bước 2.5, xử lý ở Bước 4). */
  deadLinks: Violation[]
  /** Vì sao một tệp hoặc API được giữ: tệp đầu tiên dẫn tới nó. */
  via: Record<string, string>
}

const SPECIAL = /^(page|layout|template|loading|error|not-found|default|opengraph-image|twitter-image|icon|apple-icon|route)\.(tsx?|jsx?)$/
const ANCESTOR_SPECIAL = /^(layout|template|loading|error|not-found)\.(tsx?|jsx?)$/
const SOURCE = /\.(tsx?|mts|jsx?|mjs|json|css)$/

/** Test không bao giờ là gốc dò; công cụ cắt giữ test khi mọi tệp nó dùng đều được giữ. */
export function isTestFile(file: string): boolean {
  return /\.(test|spec)\.(tsx?|jsx?|mts)$/.test(file) || file.includes("/__tests__/") || file.includes("/__mocks__/")
}

function walk(root: string, dir: string): string[] {
  return readdirSync(path.join(root, dir)).flatMap((entry) => {
    const rel = `${dir}/${entry}`
    return statSync(path.join(root, rel)).isDirectory() ? walk(root, rel) : [rel]
  })
}

interface RouteDir {
  dir: string
  pattern: string
  kind: "page" | "api"
}

function routeDirs(appFiles: string[]): RouteDir[] {
  const dirs = new Map<string, RouteDir>()
  for (const file of appFiles) {
    const name = path.posix.basename(file)
    if (!/^(page|route)\.(tsx?|jsx?)$/.test(name)) continue
    const dir = path.posix.dirname(file)
    const pattern = dirToPattern(path.posix.relative("src/app", dir))
    const kind = pattern === "/api" || pattern.startsWith("/api/") ? "api" : "page"
    dirs.set(dir, { dir, pattern, kind })
  }
  return [...dirs.values()]
}

const flat = <T, K extends keyof T>(groups: T[], key: K) => groups.flatMap((group) => group[key] as unknown as string[])

export function tracePhase(root: string, manifest: PhaseManifest): PhaseTrace {
  const srcFiles = walk(root, "src").filter(
    (file) => SOURCE.test(file) && !file.startsWith("src/generated/") && !isTestFile(file),
  )
  const appFiles = srcFiles.filter((file) => file.startsWith("src/app/"))
  const routes = routeDirs(appFiles)
  const filesByDir = new Map<string, string[]>()
  for (const file of appFiles) {
    const dir = path.posix.dirname(file)
    filesByDir.set(dir, [...(filesByDir.get(dir) ?? []), file])
  }
  const apiPatterns = [...new Set(routes.filter((route) => route.kind === "api").map((route) => route.pattern))]
  const pagePatterns = [...new Set(routes.filter((route) => route.kind === "page").map((route) => route.pattern))]

  const excludedPages = new Set(flat(manifest.excluded, "pages"))
  const excludedPrefixes = flat(manifest.excludedApis, "prefixes")
  const isExcludedApi = (pattern: string) =>
    excludedPrefixes.some((prefix) => pattern === prefix || pattern.startsWith(`${prefix}/`))
  // Thư mục của trang không giao: mọi tệp trong cây đó là vùng cấm, trừ cây con là route khác được giao
  const excludedDirs = routes.filter((route) => excludedPages.has(route.pattern)).map((route) => route.dir)
  const forbiddenDirs = [
    ...excludedDirs,
    ...routes.filter((route) => route.kind === "api" && isExcludedApi(route.pattern)).map((route) => route.dir),
  ]
  const isExcludedFile = (file: string) => forbiddenDirs.some((dir) => file.startsWith(`${dir}/`))

  const deliveredPages = new Set([...manifest.features.flatMap((feature) => feature.pages), ...flat(manifest.framework, "pages")])
  const frameworkRoutes = flat(manifest.frameworkRoutes, "routes")
  for (const route of frameworkRoutes) if (!route.startsWith("/api")) deliveredPages.add(route)
  const deliveredApis = new Set([...manifest.features.flatMap((feature) => feature.apis), ...frameworkRoutes.filter((r) => r.startsWith("/api"))])

  const registryFiles = new Set(manifest.registryFiles.files)
  const contentLinks: Violation[] = []
  const kept = new Set<string>()
  const queue: string[] = []
  const violations: Violation[] = []
  const via: Record<string, string> = {}
  let current = "manifest"
  const add = (file: string) => {
    if (!kept.has(file)) {
      via[file] = current
      kept.add(file)
      queue.push(file)
    }
  }
  const addRouteDir = (dir: string) => {
    for (const file of filesByDir.get(dir) ?? []) if (SPECIAL.test(path.posix.basename(file))) add(file)
    for (let parent = path.posix.dirname(dir); parent.startsWith("src/app"); parent = path.posix.dirname(parent)) {
      for (const file of filesByDir.get(parent) ?? []) if (ANCESTOR_SPECIAL.test(path.posix.basename(file))) add(file)
    }
  }
  const addApi = (pattern: string) => {
    if (deliveredApis.has(pattern) && kept.has(`#${pattern}`)) return
    deliveredApis.add(pattern)
    kept.add(`#${pattern}`)
    via[pattern] = current
    for (const route of routes) if (route.kind === "api" && route.pattern === pattern) addRouteDir(route.dir)
  }

  for (const file of manifest.rootFiles) if (existsSync(path.join(root, file))) add(file)
  for (const route of routes) if (route.kind === "page" && deliveredPages.has(route.pattern)) addRouteDir(route.dir)
  for (const pattern of [...deliveredApis]) addApi(pattern)

  while (queue.length > 0) {
    const file = queue.shift()!
    current = file
    const source = readSource(root, file)
    for (const specifier of importSpecifiers(source)) {
      const target = resolveImport(root, file, specifier)
      if (!target || !target.startsWith("src/")) continue
      if (isExcludedFile(target) && !isExcludedFile(file)) violations.push({ from: file, to: target })
      add(target)
    }
    for (const href of linkReferences(source)) contentLinks.push({ from: file, to: href })
    if (registryFiles.has(file)) continue
    for (const ref of apiReferences(source)) {
      for (const pattern of routesForRef(ref, apiPatterns)) {
        if (isExcludedApi(pattern)) {
          if (!isExcludedFile(file)) violations.push({ from: file, to: pattern })
          continue
        }
        addApi(pattern)
      }
    }
  }

  const files = [...kept].filter((file) => file.startsWith("src/")).sort()
  const apis = apiPatterns.filter((pattern) => deliveredApis.has(pattern) && !isExcludedApi(pattern)).sort()
  const pages = pagePatterns.filter((pattern) => deliveredPages.has(pattern)).sort()
  const blockedPages = pagePatterns.filter((pattern) => !deliveredPages.has(pattern))
  const deadLinks = contentLinks
    .filter((link) => !isExcludedFile(link.from))
    .filter((link) => {
      const match = bestMatch(pagePatterns, link.to)
      return match !== null && blockedPages.includes(match)
    })
    .sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to))
  const unique = new Map(violations.map((violation) => [`${violation.from}→${violation.to}`, violation]))
  return {
    pages,
    apis,
    blockedPages: blockedPages.sort(),
    deadLinks,
    blockedApis: apiPatterns.filter((pattern) => !apis.includes(pattern)).sort(),
    files,
    droppedFiles: srcFiles.filter((file) => !kept.has(file)).sort(),
    via,
    violations: [...unique.values()].sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to)),
  }
}
