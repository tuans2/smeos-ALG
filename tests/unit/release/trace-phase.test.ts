import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { acceptedViolations, loadManifest, renderReport, renderRoutes, reportFile, routesFile } from "../../../scripts/release/gen-phase-routes"
import { apiReferences, importSpecifiers, normalizeApiRef, routesForRef } from "../../../scripts/release/trace-imports"
import { tracePhase } from "../../../scripts/release/trace-phase"

/** Kế hoạch bàn giao GD1, Bước 2.3 và 2.5: dò phạm vi từ manifest theo import và chuỗi `/api/...`. */
describe("đọc import và tham chiếu API", () => {
  it("bắt mọi dạng import, kể cả tên biến có dấu và export lại", () => {
    const source = [
      'import a from "@/a"',
      'import type { B } from "./b"',
      'import {\n  chấm,\n  type NgữCảnh,\n} from "../c"',
      'export { d } from "./d"',
      'export * from "./e"',
      'const f = await import("@/f")',
      'import "./g.css"',
      'vi.mock("@/h")',
      "export function khongPhaiImport() {}",
    ].join("\n")
    expect(importSpecifiers(source).sort()).toEqual(["../c", "./b", "./d", "./e", "./g.css", "@/a", "@/f", "@/h"])
  })

  it("thay hằng gốc vào template và chuẩn hoá đoạn động", () => {
    const source = [
      'const BASE = "/api/v1/coordinator"',
      "fetch(`${BASE}/orders/${id}/close`)",
      'fetch(BASE + "/stats")',
      "fetch(`${origin}/api/v1/social-publishing/channels/${c}/callback?x=1`)",
    ].join("\n")
    expect(apiReferences(source)).toEqual(
      expect.arrayContaining([
        "/api/v1/coordinator",
        "/api/v1/coordinator/orders/*/close",
        "/api/v1/coordinator/stats",
        "/api/v1/social-publishing/channels/*/callback",
      ]),
    )
    expect(normalizeApiRef("/api/v1/orders/{id}?page=2")).toBe("/api/v1/orders/*")
  })

  it("tên hằng có `$` vẫn được thay khi nối chuỗi", () => {
    const source = ['const API$BASE = "/api/v1/coordinator"', 'fetch(API$BASE + "/stats")'].join("\n")
    expect(apiReferences(source)).toContain("/api/v1/coordinator/stats")
  })

  it("tham chiếu khớp route động; chuỗi gốc lấy mọi route con", () => {
    const patterns = ["/api/v1/orders", "/api/v1/orders/[id]", "/api/v1/orders/[id]/close", "/api/v1/storage/[...key]"]
    expect(routesForRef("/api/v1/orders/*", patterns)).toEqual(["/api/v1/orders/[id]"])
    expect(routesForRef("/api/v1/orders/export", patterns)).toEqual(["/api/v1/orders/[id]"])
    expect(routesForRef("/api/v1/storage/org/a.jpg", patterns)).toEqual(["/api/v1/storage/[...key]"])
    expect(routesForRef("/api/v1/storage", patterns)).toEqual(["/api/v1/storage/[...key]"])
    expect(routesForRef("/api/v1/khong-co", patterns)).toEqual([])
  })
})

describe("phạm vi gd1 dò từ code hiện tại", () => {
  const root = process.cwd()
  const manifest = loadManifest(root, "gd1")
  const trace = tracePhase(root, manifest)

  it("danh sách route và báo cáo phụ thuộc đã sinh lại (npm run release:routes)", () => {
    expect(readFileSync(path.join(root, routesFile("gd1")), "utf8")).toBe(renderRoutes("gd1", trace))
    expect(readFileSync(path.join(root, reportFile("gd1")), "utf8")).toBe(renderReport("gd1", trace, acceptedViolations(manifest)))
  })

  it("không có phụ thuộc mới vào vùng không giao", () => {
    const accepted = acceptedViolations(manifest)
    expect(trace.violations.map((v) => `${v.from} → ${v.to}`).filter((key) => !accepted.has(key))).toEqual([])
  })

  it("phụ thuộc đã ghi nhận vẫn còn thật — hết thì xoá khỏi manifest", () => {
    const current = new Set(trace.violations.map((v) => `${v.from} → ${v.to}`))
    expect([...acceptedViolations(manifest)].filter((key) => !current.has(key))).toEqual([])
  })

  it("không giữ tệp nào của trang không giao làm gốc, và bảng tra có thật", () => {
    expect(trace.files.filter((file) => /\/(creative-studio|van-hanh\/nganh|market-intelligence)\/page\.tsx$/.test(file))).toEqual([])
    for (const file of [...manifest.registryFiles.files, ...manifest.rootFiles]) expect(trace.files.concat("prisma/seed.ts"), file).toContain(file)
  })
})
