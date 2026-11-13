import { describe, expect, it } from "vitest"
import {
  catalogItemToProduct,
  resolveCatalogProductPrice,
} from "@/modules/greeting-card/domain/catalog-product-price"

describe("giá mẫu hoa trong thẻ chào", () => {
  it("ưu tiên giá của sản phẩm, rồi tới biến thể đầu tiên", () => {
    expect(resolveCatalogProductPrice({ attributes: { price: 1_950_000 }, variants: [{ attributes: { price: 1 } }] })).toBe(1_950_000)
    expect(resolveCatalogProductPrice({ attributes: {}, variants: [{ attributes: { price: 480_000 } }] })).toBe(480_000)
  })

  it("trả null khi chưa khai báo giá hoặc giá không hợp lệ", () => {
    expect(resolveCatalogProductPrice({ attributes: { price: "1000" } })).toBeNull()
    expect(resolveCatalogProductPrice({ attributes: { price: 0 }, variants: [] })).toBeNull()
  })

  it("link gửi riêng dùng cùng giá với link công khai (không còn 500.000 × hệ số)", () => {
    const item = {
      sort_order: 2,
      product: { id: "p1", code: "ML-01", name: "Kệ hoa", attributes: { price: 1_950_000 }, variants: [{ attributes: {} }] },
    }
    expect(catalogItemToProduct(item).price).toBe(1_950_000)
  })

  it("sản phẩm chưa có giá là null (hiển thị \"Giá liên hệ\"), không tự gán 500.000 hay 0", () => {
    const item = { sort_order: 0, product: { id: "p2", code: "X", name: "Bó hoa", attributes: null, variants: [] } }
    expect(catalogItemToProduct(item).price).toBeNull()
  })

  it("đọc cả attributes.price_vnd — cùng giá với trang khách", () => {
    expect(resolveCatalogProductPrice({ attributes: { price_vnd: 650_000 } })).toBe(650_000)
  })
})
