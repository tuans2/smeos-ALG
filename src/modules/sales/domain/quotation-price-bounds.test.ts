import { describe, expect, it } from "vitest"
import { productLinesCeilingBase } from "./quotation-price-bounds"

/** PO 07/11/2026 (Q3): trần chỉ so với tiền của các dòng có sản phẩm. */
describe("productLinesCeilingBase", () => {
  it("trừ dòng tự do khỏi tiền hàng", () => {
    expect(productLinesCeilingBase([{ productId: "p1", qty: 1, unitPrice: 500_000 }, { qty: 2, unitPrice: 50_000 }], 600_000)).toBe(500_000)
  })
  it("không có dòng sản phẩm → bỏ qua trần", () => {
    expect(productLinesCeilingBase([{ qty: 1, unitPrice: 500_000 }], 500_000)).toBeNull()
  })
})
