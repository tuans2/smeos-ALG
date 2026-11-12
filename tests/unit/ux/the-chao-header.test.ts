import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

/**
 * T3-4 (quyết định 11/11/2026): bộ chọn chế độ "Gửi nhanh / Quản lý" ở đầu Thẻ chào không có tabpanel nên
 * là nhóm nút `aria-pressed`, không dùng role="tab" (OPERATING_PRINCIPLES §3); nút dùng `Button` (lint R18).
 */
describe("Đầu trang Thẻ chào — nhóm chọn chế độ", () => {
  const src = readFileSync(path.resolve(__dirname, "../../../src/app/(app)/the-chao/page.tsx"), "utf-8")

  it("dùng nhóm nút aria-pressed thay cho tablist/tab", () => {
    expect(src).toMatch(/role="group" aria-label="Chế độ làm việc"/)
    expect(src).toContain("aria-pressed={active}")
    expect(src).not.toMatch(/role="tablist" aria-label="Chế độ làm việc"/)
    expect(src).not.toMatch(/role="tab"\s/)
  })

  it("không còn <button> thô; nút làm mới vẫn có nhãn truy cập", () => {
    expect(src).not.toMatch(/<button\b/)
    expect(src).toMatch(/aria-label="Làm mới"/)
  })
})
