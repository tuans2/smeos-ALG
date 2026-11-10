import { existsSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { stripBlocks } from "./cut-strip"

/**
 * Đọc import và chuỗi `/api/...` trong một tệp nguồn (Bước 2.3 của kế hoạch bàn giao GD1). Dò bằng regex,
 * không dựng AST: thừa thì bản cắt giữ thêm tệp, không bao giờ làm thiếu.
 */
const IMPORT_PATTERNS = [
  /\bimport\s+(?:type\s+)?(?:[^"'`;]*?\s+from\s+)?["']([^"']+)["']/g,
  /\bexport\s+(?:type\s+)?(?:\*(?:\s+as\s+[\w$]+)?|\{[^}]*\})\s*from\s+["']([^"']+)["']/g,
  /\bimport\(\s*["']([^"']+)["']\s*\)/g,
  /\brequire\(\s*["']([^"']+)["']\s*\)/g,
  /\bvi\.(?:mock|doMock|importActual)\(\s*["']([^"']+)["']/g,
]

const EXTENSIONS = [".ts", ".tsx", ".mts", ".js", ".mjs", ".jsx", ".json", ".css"]

export function importSpecifiers(source: string): string[] {
  const found = new Set<string>()
  for (const pattern of IMPORT_PATTERNS) {
    for (const match of source.matchAll(pattern)) found.add(match[1]!)
  }
  return [...found]
}

function isFile(candidate: string): boolean {
  return existsSync(candidate) && statSync(candidate).isFile()
}

const resolved = new Map<string, string | null>()

/** Đường dẫn tương đối repo của tệp được import, hoặc `null` khi là thư viện ngoài. */
export function resolveImport(root: string, fromFile: string, specifier: string): string | null {
  const key = `${root}|${specifier.startsWith(".") ? path.dirname(fromFile) : ""}|${specifier}`
  if (!resolved.has(key)) resolved.set(key, resolveUncached(root, fromFile, specifier))
  return resolved.get(key)!
}

function resolveUncached(root: string, fromFile: string, specifier: string): string | null {
  let base: string
  if (specifier.startsWith("@/")) base = path.join(root, "src", specifier.slice(2))
  else if (specifier.startsWith(".")) base = path.resolve(root, path.dirname(fromFile), specifier)
  else return null
  const candidates = [
    base,
    ...EXTENSIONS.map((ext) => base + ext),
    ...EXTENSIONS.map((ext) => path.join(base, `index${ext}`)),
  ]
  // `import "./x.js"` trỏ tới `x.ts` (ESM kiểu TypeScript)
  if (/\.(m?js|jsx)$/.test(base)) candidates.push(base.replace(/\.(m?js|jsx)$/, ".ts"), base.replace(/\.(m?js|jsx)$/, ".tsx"))
  const hit = candidates.find(isFile)
  return hit ? path.relative(root, hit).split(path.sep).join("/") : null
}

const CONST_API = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::\s*string\s*)?=\s*["'`](\/api\/[^"'`\s]*)["'`]/g
const API_LITERAL = /(?:["'`]|\})(\/api(?:\/[^"'`\s]*)?)/g

/** Chuẩn hoá một tham chiếu API: bỏ query, đoạn nội suy/placeholder thành `*`. */
export function normalizeApiRef(raw: string): string {
  const withoutQuery = raw.split("?")[0]!.split("#")[0]!
  return withoutQuery
    .split("/")
    .filter(Boolean)
    .map((segment) => (/\$\{|\{|\}|…|\*|:/.test(segment) ? "*" : segment))
    .reduce((acc, segment) => `${acc}/${segment}`, "")
}

/** Các tham chiếu `/api/...` trong mã, đã thay hằng `const BASE = "/api/v1/x"` vào `${BASE}`. */
export function apiReferences(source: string): string[] {
  let expanded = source
  for (const match of source.matchAll(CONST_API)) {
    const [, name, value] = match
    expanded = expanded.split(`\${${name}}`).join(value)
    expanded = expanded.replace(new RegExp(`\\b${name!.replace(/\$/g, "\\$")}\\s*\\+\\s*["'\`]`, "g"), `"${value}`)
  }
  const refs = new Set<string>()
  // `${BASE}` vừa thay có thể nằm giữa template — quét lại cả chuỗi đã mở rộng
  for (const match of expanded.matchAll(API_LITERAL)) refs.add(normalizeApiRef(match[1]!))
  return [...refs].filter((ref) => ref.startsWith("/api"))
}

function refMatchesPattern(ref: string, pattern: string): boolean {
  const refParts = ref.split("/").filter(Boolean)
  const patternParts = pattern.split("/").filter(Boolean)
  for (let index = 0; index < patternParts.length; index += 1) {
    const part = patternParts[index]!
    if (/^\[\[?\.\.\./.test(part)) return refParts.length >= index + (part.startsWith("[[") ? 0 : 1)
    const refPart = refParts[index]
    if (refPart === undefined) return false
    if (refPart === "*" || part.startsWith("[")) continue
    if (refPart !== part) return false
  }
  return refParts.length === patternParts.length
}

/**
 * Route API mà một tham chiếu có thể trỏ tới. Không khớp đúng độ dài thì lấy mọi route có tiền tố đó
 * (chuỗi `"/api/v1/coordinator"` dùng làm gốc ghép đường dẫn).
 */
export function routesForRef(ref: string, patterns: readonly string[]): string[] {
  const exact = patterns.filter((pattern) => refMatchesPattern(ref, pattern))
  if (exact.length > 0) return exact
  const prefix = ref.split("/").filter((part) => part && part !== "*")
  const refParts = ref.split("/").filter(Boolean)
  if (prefix.length !== refParts.length || prefix.length < 3) return []
  return patterns.filter((pattern) => {
    const parts = pattern.split("/").filter(Boolean)
    return prefix.every((part, index) => parts[index] === part || parts[index]?.startsWith("["))
  })
}

/** Nội dung tệp như trong bản cắt: đã bỏ khối `@release-strip`. */
export function readSource(root: string, file: string): string {
  return stripBlocks(readFileSync(path.join(root, file), "utf8"))
}

const LINK_LITERAL = /\b(?:href|router\.(?:push|replace))\s*(?:=\s*\{?|\(\s*)["'`](\/[^"'`$?#\s]*)/g

/** Đường dẫn trang viết cứng trong `href=` hoặc `router.push(...)`. */
export function linkReferences(source: string): string[] {
  return [...new Set([...source.matchAll(LINK_LITERAL)].map((match) => match[1]!))].filter((href) => !href.startsWith("/api"))
}
