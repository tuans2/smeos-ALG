import { describe, expect, it } from "vitest"

import { pitchToRecord, readSalesPitch, salesPitchRecord, salesPitchTooLarge, SALES_PITCH_ATTRIBUTE_KEY, toSalesPitchData, withSalesPitch } from "./sales-pitch-record"
import type { SalesPitchData } from "./sales-pitch-template"

const pitch: SalesPitchData = {
  productName: "Giỏ quà Tết An Khang",
  sku: "GQ-01",
  imageUrl: "https://signed.example/x.jpg?sig=1",
  style: "Sang trọng",
  occasions: ["Tết"],
  occasionRegister: "FESTIVE",
  description: "Giỏ quà gồm trà, bánh và thiệp chúc.",
  mainFlowers: [{ id: "f-0", name: "Hộp trà", quantity: 2, unit: "hộp", color: "Đỏ", role: "Chủ đạo" }],
  foliageItems: [],
  accessoryItems: [{ id: "a-0", name: "Nơ", quantity: 1, unit: "cái" }],
  wrapping: "Giỏ mây",
  container: "Giỏ",
  dimensions: { heightCm: 40, widthCm: null },
  priceVnd: 850000,
  originalPriceVnd: null,
  priceSegment: "premium",
  freeGifts: ["Thiệp viết tay"],
  guarantees: ["Giao trong 2 giờ"],
  shopName: "Cửa hàng Mộc",
  shopHotline: "0901234567",
  status: "DRAFT",
}

describe("Thẻ chào sản phẩm lưu Kho", () => {
  it("đổi qua lại không mất dữ liệu; không lưu link ảnh ký có hạn", () => {
    const record = salesPitchRecord.parse(pitchToRecord(pitch))
    expect(JSON.stringify(record)).not.toContain("signed.example")
    const attrs = withSalesPitch({ bom: { a: 1 } }, record, { userId: "u1", at: new Date("2026-11-08T00:00:00Z") })
    const stored = readSalesPitch(attrs)!
    const back = toSalesPitchData(stored, { productId: "p1", analysisId: "an1", imageUrl: "https://new/x.jpg" })
    expect(back).toMatchObject({ productName: pitch.productName, priceVnd: 850000, imageUrl: "https://new/x.jpg", status: "FINALIZED", productId: "p1" })
    expect(back.mainFlowers[0]).toMatchObject({ name: "Hộp trà", quantity: 2, color: "Đỏ" })
    expect(back.dimensions).toEqual({ heightCm: 40, widthCm: null })
  })

  it("gộp vào attributes giữ khoá khác; chốt lại tăng phiên bản", () => {
    const record = pitchToRecord(pitch)
    const once = withSalesPitch({ bom: { a: 1 }, proposal: { status: "PENDING" } }, record, { userId: "u1", at: new Date() })
    const twice = withSalesPitch(once, record, { userId: "u2", at: new Date() })
    expect(twice.bom).toEqual({ a: 1 })
    expect(twice.proposal).toEqual({ status: "PENDING" })
    expect(readSalesPitch(twice)).toMatchObject({ version: 2, finalized_by: "u2" })
  })

  it("dữ liệu hỏng → coi như chưa chốt; thẻ dài tối đa theo lược đồ vẫn dưới trần lưu; thiếu tên bị từ chối", () => {
    expect(readSalesPitch({ [SALES_PITCH_ATTRIBUTE_KEY]: { data: { product_name: 1 } } })).toBeNull()
    expect(readSalesPitch(null)).toBeNull()
    const huge = { ...pitchToRecord(pitch), description: "x".repeat(4000), guarantees: Array.from({ length: 20 }, () => "y".repeat(200)), free_gifts: Array.from({ length: 20 }, () => "z".repeat(200)), occasions: Array.from({ length: 20 }, () => "w".repeat(200)) }
    expect(salesPitchTooLarge(huge)).toBe(false)
    expect(salesPitchRecord.safeParse({ ...pitchToRecord(pitch), product_name: " " }).success).toBe(false)
  })
})
