import { describe, expect, it } from "vitest"

import { draftProductCode, isAutoProductCode } from "../product-code"

describe("quy ước mã sản phẩm do hệ thống tạo", () => {
  it("cùng một quy ước cho cả hai cổng duyệt", () => {
    const ma = draftProductCode("3f2a1b7c-9d4e-4a11-8bcd-0123456789ab")
    expect(ma).toBe("AUTO-3F2A1B7C")
    expect(isAutoProductCode(ma)).toBe(true)
  })

  it("luôn tám ký tự sau tiền tố, không mang dấu gạch của uuid", () => {
    const ma = draftProductCode("ab-cd-ef-gh-ijklmnop")
    expect(ma.startsWith("AUTO-")).toBe(true)
    expect(ma.slice("AUTO-".length)).toHaveLength(8)
    expect(ma).not.toContain("AUTO--")
  })

  it("mã do người nhập không bị nhận nhầm là mã sinh máy", () => {
    expect(isAutoProductCode("GHCB0001")).toBe(false)
  })
})
