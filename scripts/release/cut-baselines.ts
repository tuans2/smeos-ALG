import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import path from "node:path"

/**
 * Làm lại các tệp baseline kiểm kiến trúc cho bản cắt (Bước 2.3 mục 5): bỏ mục trỏ tới tệp hoặc route
 * không còn. Các baseline chỉ được thu hẹp, nên bỏ mục của phần không giao không nới luật nào.
 */
const JSON_BASELINES = ["scripts/file-size-baseline.json", "scripts/eslint-baseline.json", "scripts/codeql-baseline.json"]
const ARCH_DIR = "tests/unit/architecture"
/** Test giữ danh sách route trong mã nguồn (khoá là đường dẫn dưới `src/app/api/v1`). */
const INLINE_ROUTE_LISTS = ["tests/unit/architecture/route-capability-guard.test.ts"]

function pathOfKey(key: string): string | null {
  const candidate = key.includes("|") ? key.split("|").pop()! : key
  return /^(src|scripts|tests|prisma|workers)\//.test(candidate) ? candidate : null
}

function prune(value: unknown, exists: (file: string) => boolean, removed: string[]): unknown {
  if (Array.isArray(value)) return value.map((item) => prune(item, exists, removed))
  if (!value || typeof value !== "object") return value
  const out: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    const file = pathOfKey(key)
    if (file && !exists(file)) {
      removed.push(key)
      continue
    }
    out[key] = prune(child, exists, removed)
  }
  // eslint-baseline: tổng phải khớp lại sau khi bỏ tệp
  if (typeof out.total === "number" && out.files && typeof out.files === "object") {
    out.total = Object.values(out.files as Record<string, Record<string, number>>)
      .flatMap((rules) => Object.values(rules))
      .reduce((sum, n) => sum + n, 0)
  }
  return out
}

const routeExists = (root: string, key: string) => existsSync(path.join(root, "src/app/api/v1", key, "route.ts"))

/** Dòng của danh sách `.txt`: giữ chú thích; mục cuối dòng là tệp hoặc khoá route còn tồn tại. */
function keepLine(root: string, line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith("#")) return true
  const token = trimmed.split(/\s+/).pop()!
  return existsSync(path.join(root, token)) || routeExists(root, token)
}

export function rebuildBaselines(root: string): { file: string; removed: string[] }[] {
  const report: { file: string; removed: string[] }[] = []
  const exists = (file: string) => existsSync(path.join(root, file))
  for (const file of JSON_BASELINES.filter(exists)) {
    const removed: string[] = []
    const data = prune(JSON.parse(readFileSync(path.join(root, file), "utf8")), exists, removed)
    if (removed.length) {
      writeFileSync(path.join(root, file), `${JSON.stringify(data, null, 2)}\n`)
      report.push({ file, removed })
    }
  }
  const lists = exists(ARCH_DIR) ? readdirSync(path.join(root, ARCH_DIR)).filter((f) => f.endsWith(".txt")) : []
  for (const name of lists) {
    const file = `${ARCH_DIR}/${name}`
    const lines = readFileSync(path.join(root, file), "utf8").split("\n")
    const removed = lines.filter((line) => !keepLine(root, line))
    if (removed.length) {
      writeFileSync(path.join(root, file), lines.filter((line) => keepLine(root, line)).join("\n"))
      report.push({ file, removed: removed.map((line) => line.trim()) })
    }
  }
  // Danh sách khai trong test kiến trúc theo đường dẫn tệp: `"src/x.ts": …,` trên một dòng
  const pathEntry = /^\s*"((?:src|workers|scripts|prisma)\/[^"]+\.[a-z]+)":\s*\S.*,\s*$/
  const archTests = exists(ARCH_DIR) ? readdirSync(path.join(root, ARCH_DIR)).filter((f) => f.endsWith(".test.ts")) : []
  for (const name of archTests) {
    const file = `${ARCH_DIR}/${name}`
    const lines = readFileSync(path.join(root, file), "utf8").split("\n")
    const stale = (line: string) => {
      const key = pathEntry.exec(line)?.[1]
      return key !== undefined && !exists(key)
    }
    const removed = lines.filter(stale)
    if (removed.length) {
      writeFileSync(path.join(root, file), lines.filter((line) => !stale(line)).join("\n"))
      report.push({ file, removed: removed.map((line) => pathEntry.exec(line)![1]!) })
    }
  }
  for (const file of INLINE_ROUTE_LISTS.filter(exists)) {
    const lines = readFileSync(path.join(root, file), "utf8").split("\n")
    const entry = /^\s*"([^"]+)":\s*"/
    const stale = (line: string) => {
      const key = entry.exec(line)?.[1]
      return key !== undefined && !routeExists(root, key)
    }
    const removed = lines.filter(stale)
    if (removed.length) {
      writeFileSync(path.join(root, file), lines.filter((line) => !stale(line)).join("\n"))
      report.push({ file, removed: removed.map((line) => entry.exec(line)![1]!) })
    }
  }
  return report
}
