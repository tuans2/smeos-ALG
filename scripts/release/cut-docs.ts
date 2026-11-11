import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import path from "node:path"

/**
 * Căn tài liệu đặc tả theo mã của bản cắt (kế hoạch GD1, Bước 2.3 — "tài liệu khớp bản giao"): công cụ kiểm
 * tài liệu (`check:docs`, `check:template-ssot`) chạy được trên bản cắt mà không phải viết lại tài liệu bằng tay.
 *
 * - Đặc tả API 06: bỏ method/dòng của endpoint không còn route trong bản cắt.
 * - SSOT hệ mẫu: dòng nhắc tệp mẫu không có trong bản cắt được đánh dấu "(ngoài SSOT)".
 */
export const API_SPEC = "docs/dac-ta/06-api-specification.md"
export const TEMPLATE_SSOT = "docs/kien-truc/FLORAOS_TEMPLATE_SYSTEM_SSOT.md"
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"]

/** Khoá so khớp giống `scripts/check-docs.mjs`: `GET /orders/{}`. */
export function endpointKey(method: string, specPath: string): string {
  return `${method} ${specPath.replace(/`/g, "").replace("/api/v1", "").trim().replace(/:\w+/g, "{}").replace(/\/$/, "")}`
}

/** Endpoint có trong mã: duyệt `src/app/api/v1/**\/route.ts`. */
export function codeEndpoints(root: string): Set<string> {
  const out = new Set<string>()
  const base = path.join(root, "src/app/api/v1")
  const dive = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry)
      if (statSync(full).isDirectory()) dive(full)
      else if (entry === "route.ts") {
        const rel = `/${path.relative(base, dir).split(path.sep).join("/")}`.replace(/\[\.\.\.(\w+)\]/g, ":$1").replace(/\[(\w+)\]/g, ":$1")
        const src = readFileSync(full, "utf8")
        const found = [
          ...[...src.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].map((m) => m[1]!),
          ...[...src.matchAll(/export\s*\{([^}]*)\}/g)].flatMap((m) => [...m[1]!.matchAll(/\bas\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].map((n) => n[1]!)),
        ]
        for (const method of found) out.add(endpointKey(method, rel === "/" ? "" : rel))
      }
    }
  }
  if (existsSync(base)) dive(base)
  return out
}

/** Bỏ method không còn route khỏi bảng của đặc tả 06; dòng không còn method nào bị bỏ. Trả văn bản mới và số dòng bỏ. */
export function alignApiSpec(text: string, endpoints: ReadonlySet<string>): { text: string; removedRows: number; trimmedRows: number } {
  let removedRows = 0
  let trimmedRows = 0
  const lines = text.split("\n").flatMap((line) => {
    if (!line.startsWith("|")) return [line]
    const cells = line.replace(/^\||\|$/g, "").split("|")
    const methods = (cells[0] ?? "").split("·").map((m) => m.trim().toUpperCase())
    if (cells.length < 2 || !methods.every((m) => METHODS.includes(m))) return [line]
    const specPath = (cells[1] ?? "").replace(/`/g, "").trim()
    if (!specPath.startsWith("/") && !specPath.startsWith("/api/v1")) return [line]
    if (/CHƯA XÂY|chưa gác|chưa xây/i.test(cells[2] ?? "")) return [line]
    const keep = methods.map((m, i) => ({ m, i })).filter(({ m }) => endpoints.has(endpointKey(m, specPath)))
    if (keep.length === methods.length) return [line]
    if (keep.length === 0) {
      removedRows += 1
      return []
    }
    trimmedRows += 1
    const caps = (cells[2] ?? "").split(" · ")
    cells[0] = ` ${keep.map(({ m }) => m).join(" · ")} `
    if (caps.length === methods.length) cells[2] = ` ${keep.map(({ i }) => caps[i]!.trim()).join(" · ")} `
    return [`|${cells.join("|")}|`]
  })
  return { text: lines.join("\n"), removedRows, trimmedRows }
}

/** Đánh dấu "(ngoài SSOT)" cho dòng nhắc tệp mẫu `.tsx` không có trong bản cắt. */
export function alignTemplateSsot(text: string, templateFiles: ReadonlySet<string>): { text: string; markedLines: number } {
  let markedLines = 0
  const lines = text.split("\n").map((line) => {
    if (line.includes("(ngoài SSOT)") || line.includes("ngoài phạm vi")) return line
    const names = (line.match(/[\w-]+\.tsx\b/g) ?? []).filter((name) => !name.startsWith("-"))
    if (names.length === 0 || names.every((name) => templateFiles.has(name))) return line
    markedLines += 1
    return `${line} (ngoài SSOT) — không có trong bản giao`
  })
  return { text: lines.join("\n"), markedLines }
}

function tsxNames(dir: string): Set<string> {
  const out = new Set<string>()
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) for (const name of tsxNames(full)) out.add(name)
    else if (entry.endsWith(".tsx")) out.add(entry)
  }
  return out
}

/** Áp lên cây bản cắt; trả mô tả cho báo cáo cắt. */
export function alignDocs(root: string): string[] {
  const report: string[] = []
  const spec = path.join(root, API_SPEC)
  if (existsSync(spec)) {
    const result = alignApiSpec(readFileSync(spec, "utf8"), codeEndpoints(root))
    writeFileSync(spec, result.text)
    report.push(`\`${API_SPEC}\`: bỏ ${result.removedRows} dòng, rút method ở ${result.trimmedRows} dòng (endpoint không có trong bản cắt)`)
  }
  const ssot = path.join(root, TEMPLATE_SSOT)
  if (existsSync(ssot)) {
    const result = alignTemplateSsot(readFileSync(ssot, "utf8"), tsxNames(path.join(root, "src/components/templates")))
    writeFileSync(ssot, result.text)
    report.push(`\`${TEMPLATE_SSOT}\`: đánh dấu ${result.markedLines} dòng nhắc tệp mẫu không có trong bản cắt`)
  }
  return report
}
