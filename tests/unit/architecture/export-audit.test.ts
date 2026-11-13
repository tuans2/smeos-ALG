import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

/** SDAGF-018 (audit docs/audit/sdagf-2026-10): mọi route xuất dữ liệu ra tệp phải ghi audit. */
const ROOT = path.resolve(__dirname, "../../..")
const API = path.join(ROOT, "src/app/api")

function exportRoutes(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return exportRoutes(full)
    return name === "route.ts" && full.split(path.sep).includes("export") ? [full] : []
  })
}

describe("xuất dữ liệu luôn để lại audit", () => {
  const routes = exportRoutes(API)

  it("tìm thấy các route export", () => {
    expect(routes.length).toBeGreaterThanOrEqual(4)
  })

  it.each(routes.map((r) => path.relative(ROOT, r)))("%s ghi audit", (route) => {
    const src = readFileSync(path.join(ROOT, route), "utf8")
    expect(src).toMatch(/\b(recordDataExport|recordPlatformAuditLog)\(/)
  })
})
