import { describe, expect, it } from "vitest"
import { inquiryContent, validateProductInquiry } from "../product-inquiry"

const ok = { customerName: "Lan", customerPhone: "0912 345 678", message: "Cho mình hỏi giá" }

describe("product-inquiry", () => {
  it("hợp lệ khi đủ tên, SĐT di động VN, nội dung", () => {
    expect(validateProductInquiry(ok)).toEqual({})
  })

  it("báo lỗi từng trường", () => {
    const e = validateProductInquiry({ customerName: " ", customerPhone: "123", message: "x".repeat(501) })
    expect(Object.keys(e).sort()).toEqual(["customerName", "customerPhone", "message"])
  })

  it("nội dung ghi rõ mẫu, phiên bản, khách", () => {
    const c = inquiryContent({ id: "p", code: "B1", name: "Bó hồng" }, { ...ok, variantName: "Lớn / Đỏ" })
    expect(c).toContain("Mẫu: Bó hồng (B1)")
    expect(c).toContain("Phiên bản: Lớn / Đỏ")
    expect(c).toContain("0912345678")
  })
})
