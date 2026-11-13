import { describe, expect, it } from "vitest"
import { assertTestDatabase, scanRedFlags, summarize } from "./checks.mjs"

describe("ux-audit", () => {
  it("từ chối database không phải *_test", () => {
    expect(() => assertTestDatabase("postgresql://u:p@localhost:5432/floraos")).toThrow(/_test/)
    expect(assertTestDatabase("postgresql://u:p@localhost:5432/smeos_e2e_test")).toBe("smeos_e2e_test")
  })

  it("bắt dấu hiệu dữ liệu giả và ưu đãi tự đặt", () => {
    expect(scanRedFlags("Ưu đãi còn 02 : 14 : 35")).toContain("đồng hồ đếm ngược")
    expect(scanRedFlags("GIẢM 50% hôm nay")).toEqual(["ưu đãi — kiểm có bật trong Cài đặt → Ưu đãi không"])
    expect(scanRedFlags("Bó hồng đỏ · 650.000đ")).toEqual([])
    expect(scanRedFlags("https://images.unsplash.com/photo-1.jpg")).toEqual(["ảnh kho Unsplash"])
  })

  it("trạng thái lỗi khi có cuộn ngang hoặc lỗi axe nghiêm trọng", () => {
    const v = [{ id: "color-contrast", impact: "serious", nodes: [{ html: "<p>x</p>" }] }, { id: "region", impact: "moderate", nodes: [] }]
    expect(summarize({ name: "s", width: 390, scrollWidth: 390, violations: [], flags: [] })).toEqual({ line: "s @390: ok", failed: false })
    const r = summarize({ name: "s", width: 390, scrollWidth: 420, violations: v, flags: [] })
    expect(r.failed).toBe(true)
    expect(r.line).toContain("cuộn ngang 420px")
    expect(r.line).toContain("color-contrast×1")
  })
})
