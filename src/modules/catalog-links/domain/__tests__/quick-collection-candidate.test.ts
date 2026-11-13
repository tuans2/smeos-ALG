import { describe, expect, it } from "vitest"
import { generateQuickCollection } from "../quick-collection-engine"
import { toQuickCollectionCandidate } from "../quick-collection-candidate"

/** Dịp tặng/màu lấy từ dữ liệu thật của sản phẩm, không gán cứng (soát 14/10/2026). */
describe("toQuickCollectionCandidate", () => {
  const rows = [
    { id: "bo", name: "Bó hồng đỏ", price_vnd: 500_000, attributes: { occasionCodes: ["sinh-nhat"], color: "Đỏ" } },
    { id: "ke", name: "Kệ hoa trắng", price_vnd: 1_500_000, attributes: { occasionCodes: ["chia-buon"], color: "Trắng" } },
  ].map(toQuickCollectionCandidate)

  it("BST sinh nhật không lẫn kệ hoa chia buồn", () => {
    const ids = generateQuickCollection(rows, { occasion: "Sinh nhật", productLimit: 5 }).selectedProducts.map((p) => p.id)
    expect(ids).toEqual(["bo"])
  })

  it("lọc dịp chia buồn ra đúng mẫu chia buồn", () => {
    const ids = generateQuickCollection(rows, { occasion: "Chia buồn", productLimit: 5 }).selectedProducts.map((p) => p.id)
    expect(ids).toEqual(["ke"])
  })

  it("giữ giá/ảnh theo cả hai cách đặt tên trường của API", () => {
    const c = toQuickCollectionCandidate({ id: "x", name: "X", price: 300_000, masterImageUrl: "/a.jpg" })
    expect(c.price).toBe(300_000)
    expect(c.imageUrl).toBe("/a.jpg")
    expect(c.code).toBe("x")
  })
})
