import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

/**
 * ADR-013 D-I4, bước I-7: ghi nhật ký kiểm toán bắt buộc ở RANH GIỚI. Mọi route ghi (`POST/PUT/PATCH/DELETE`) có tenant
 * (`requireTenantContext`) phải ghi `audit_logs` — ở route hoặc ở use-case / repository nó gọi (sâu tối đa 3 bước) — hoặc
 * nằm trong danh sách miễn có lý do.
 *
 * Route cũ chưa ghi nằm trong `audit-boundary-debt.txt` (nợ #204); danh sách chỉ được CO LẠI: route đã ghi kiểm toán hoặc
 * đã bị xoá mà còn trong danh sách thì test đỏ.
 */

const ROOT = path.resolve(__dirname, "../../..")
const API = path.join(ROOT, "src/app/api/v1")
const DEBT_FILE = path.join(__dirname, "audit-boundary-debt.txt")

/** Lời gọi được tính là ghi nhật ký kiểm toán. */
const AUDIT = /\brecordAuditLog\(|\brecordPlatformAuditLog\(|\baudit_logs\.(create|createMany)\(|\.audit\(/
const WRITE = /export\s+(const|async\s+function|function)\s+(POST|PUT|PATCH|DELETE)\b/
const DEPTH = 3

/** Route ghi có tenant KHÔNG cần ghi kiểm toán — có chủ đích, kèm lý do. */
const EXEMPT: Record<string, string> = {}

function routeFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...routeFiles(full))
    else if (entry === "route.ts") out.push(full)
  }
  return out
}

function resolveImport(from: string, spec: string): string | null {
  let base: string
  if (spec.startsWith("@/")) base = path.join(ROOT, "src", spec.slice(2))
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec)
  else return null
  for (const candidate of [`${base}.ts`, path.join(base, "index.ts")]) {
    if (existsSync(candidate)) return candidate
  }
  return null
}

/** Ghi kiểm toán ở tệp này hoặc ở module nội bộ nó import (cùng thư mục không tính bước; `@/modules/…` tính một bước). */
function isAudited(file: string, depth: number, seen = new Set<string>()): boolean {
  if (seen.has(file)) return false
  seen.add(file)
  const source = readFileSync(file, "utf8")
  if (AUDIT.test(source)) return true
  if (depth === 0) return false
  for (const match of source.matchAll(/from "([^"]+)"/g)) {
    const spec = match[1] ?? ""
    const local = spec.startsWith(".")
    if (!local && !spec.startsWith("@/modules/")) continue
    const target = resolveImport(file, spec)
    if (target && isAudited(target, local ? depth : depth - 1, seen)) return true
  }
  return false
}

const key = (file: string) => path.relative(API, path.dirname(file)).split(path.sep).join("/")

const writeRoutes = routeFiles(API)
  .filter((file) => !key(file).startsWith("public/"))
  .filter((file) => {
    const source = readFileSync(file, "utf8")
    return WRITE.test(source) && /\brequireTenantContext\(/.test(source)
  })

const debt = new Set(
  readFileSync(DEBT_FILE, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#")),
)

describe("route ghi có tenant phải ghi nhật ký kiểm toán (ADR-013 D-I4, I-7)", () => {
  it("route mới không ghi audit_logs phải ghi kiểm toán hoặc vào EXEMPT kèm lý do", () => {
    const missing = writeRoutes
      .filter((file) => !isAudited(file, DEPTH))
      .map(key)
      .filter((k) => !(k in EXEMPT) && !debt.has(k))
    expect(missing).toEqual([])
  })

  it("danh sách miễn và tệp nợ không giữ route đã ghi kiểm toán hoặc đã bị xoá (chỉ co lại)", () => {
    const byKey = new Map(writeRoutes.map((file) => [key(file), file]))
    const stale = [...Object.keys(EXEMPT), ...debt].filter((k) => {
      const file = byKey.get(k)
      return !file || isAudited(file, DEPTH)
    })
    expect(stale).toEqual([])
  })
})
