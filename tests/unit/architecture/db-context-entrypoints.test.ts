import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { importSpecifiers, resolveImport } from "../../../scripts/release/trace-imports"

/**
 * ADR-013 (audit DB-01/DB-09, chuẩn bị I-6): trong tiến trình web, truy vấn ngoài mọi ngữ cảnh CSDL không có quyền
 * hệ thống — ở chế độ `enforce` thấy 0 dòng bảng thuộc tổ chức. Mọi điểm vào phía máy chủ (trang, layout, ảnh xem
 * trước, route ngoài `/api` hay route không qua `handle()`) mà chuỗi import chạm tới Prisma phải tự mở ngữ cảnh:
 * `handle()` / `defineRoute()`, `withRequestDb()` (trang có phiên), `asSystemDb()` (trang công khai tra theo mã),
 * `withTenantDb()`. Server Component tự tải dữ liệu cũng vậy (React vẽ nó sau khi trang trả về, ngoài ngữ cảnh trang).
 */
const ROOT = process.cwd()
const PRISMA = "src/core/tenancy/infra/prisma.ts"
const WRAPPER = /\bhandle(<[^\n]*?>)?\(|\bdefineRoute\(|\bwithRequestDb\(|\basSystemDb\(|\bwithTenantDb\(/

/** Hàm dùng chung tự mở ngữ cảnh bên trong — điểm vào chỉ gọi chúng thì không cần mở thêm. */
const SELF_CONTEXT = new Set([
  "src/modules/organization/use-cases/resolve-app-session.ts",
  "src/modules/organization/use-cases/check-session.ts",
  "src/modules/platform/use-cases/resolve-platform-session.ts",
])

/** Điểm vào không chạm bảng thuộc tổ chức — ghi lý do. */
const ALLOWED: Record<string, string> = {
  "src/app/api/health/route.ts": "chỉ `SELECT 1` (pingDatabase)",
  "src/app/api/health/ready/route.ts": "chỉ `SELECT 1` (pingDatabase) và Redis",
}

const ENTRY = /\/(page|layout|template|default|not-found|error|route|opengraph-image|twitter-image|sitemap|robots)\.tsx?$/

function walk(dir: string): string[] {
  return readdirSync(path.join(ROOT, dir)).flatMap((entry) => {
    const rel = `${dir}/${entry}`
    return statSync(path.join(ROOT, rel)).isDirectory() ? walk(rel) : [rel]
  })
}

const text = (file: string) => readFileSync(path.join(ROOT, file), "utf8")
const isClient = (file: string) => /^\s*["']use client["']/.test(text(file))
const isSource = (file: string) => /\.(ts|tsx)$/.test(file) && !/\.test\.tsx?$/.test(file) && !file.includes("__tests__")

const imports = (file: string) =>
  importSpecifiers(text(file))
    .map((spec) => resolveImport(ROOT, file, spec))
    .filter((target): target is string => target !== null && target.startsWith("src/") && isSource(target))

const memo = new Map<string, boolean>()
function reachesPrisma(file: string, seen = new Set<string>()): boolean {
  if (file === PRISMA) return true
  if (SELF_CONTEXT.has(file) || seen.has(file) || isClient(file)) return false
  if (memo.has(file)) return memo.get(file)!
  seen.add(file)
  const hit = imports(file).some((target) => reachesPrisma(target, seen))
  memo.set(file, hit)
  return hit
}

/** Điểm vào hoặc tệp cùng cây `src/app` mà nó import tương đối (handler dùng chung) mở ngữ cảnh. */
function opensContext(file: string): boolean {
  if (WRAPPER.test(text(file))) return true
  return importSpecifiers(text(file))
    .filter((spec) => spec.startsWith("."))
    .map((spec) => resolveImport(ROOT, file, spec))
    .some((target) => target !== null && isSource(target) && WRAPPER.test(text(target)))
}

describe("điểm vào phía máy chủ chạm CSDL phải mở ngữ cảnh RLS", () => {
  const files = walk("src").filter((f) => isSource(f) && !f.startsWith("src/generated/"))

  it("trang, layout, ảnh xem trước, route", () => {
    const entries = files.filter((f) => f.startsWith("src/app/") && ENTRY.test(f) && !isClient(f))
    const missing = entries.filter((f) => !(f in ALLOWED) && reachesPrisma(f) && !opensContext(f))
    expect(missing, "Bọc phần tải dữ liệu bằng withRequestDb / asSystemDb (xem src/core/tenancy/db-context.ts)").toEqual([])
  })

  it("Server Component tự tải dữ liệu", () => {
    const components = files.filter(
      (f) => f.startsWith("src/components/") && f.endsWith(".tsx") && !isClient(f) && /export (default )?async function/.test(text(f)),
    )
    expect(components.filter((f) => reachesPrisma(f) && !WRAPPER.test(text(f)))).toEqual([])
  })

  it("danh sách miễn trừ không giữ tệp không còn", () => {
    expect(Object.keys(ALLOWED).filter((f) => !files.includes(f))).toEqual([])
  })
})
