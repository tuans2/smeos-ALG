import { describe, expect, it } from "vitest"

import { projectApprovedProduct } from "./approved-product-context"
import type { SalesPitchRecord } from "@/modules/products/domain/sales-pitch-record"

const analysis = {
  identity: { phong_cach: "Hiện đại" },
  bom: {
    flowers: [{ name: "Hồng đỏ", quantity: 12, dvt_dem: "bông", mo_ta_mau: "đỏ" }, { name: "Cúc", count: "3", role: "hoa phụ" }],
    foliage: [{ name: "Lá bạc", quantity: 5 }],
    accessories: [{ name: "Nơ lụa" }],
    wrapping: [{ layer: "Lớp 1", material: "Giấy kraft" }],
  },
}
const copy = {
  suggested_name: "Bó hồng Tình Yêu",
  key_selling_points: ["Hoa tươi trong ngày", ""],
  flower_meaning_story: "Hồng đỏ là lời yêu thương.",
  target_audience: { recipient: "Người yêu", buyer_persona: "Nam 25–35" },
  suggested_occasions: ["Valentine"],
}
const pitch: SalesPitchRecord = {
  product_name: "Bó hồng Tình Yêu đặc biệt", sku: null, style: "Lãng mạn", occasions: ["Sinh nhật"], occasion_register: "FESTIVE",
  description: "", main_items: [{ name: "Hồng Ohara", quantity: 15, unit: "bông", color: "hồng", role: null }], foliage_items: [], accessory_items: [],
  wrapping: "Giấy lụa", container: "Bó", height_cm: null, width_cm: null, price_vnd: 650000, original_price_vnd: null, price_segment: "premium",
  free_gifts: [], guarantees: [], shop_name: null, shop_hotline: null, custom_note: null, cta_phrase: null, greeting_line: null,
}

describe("Brief từ dữ liệu đã duyệt của sản phẩm", () => {
  it("chỉ có Thẻ sản phẩm + Bài giới thiệu → thành phần từ bản quét, câu chữ từ bài giới thiệu", () => {
    const r = projectApprovedProduct({ productId: "p1", productName: "SP-1", analysis, copy, pitch: null })
    expect(r.product).toMatchObject({ name: "Bó hồng Tình Yêu", style: "Hiện đại", price: { exact: null } })
    expect(r.product.components).toEqual([
      { flowerType: "Hồng đỏ", quantityEstimate: 12, unit: "bông", role: "dominant", color: "đỏ" },
      { flowerType: "Cúc", quantityEstimate: 3, unit: null, role: "supporting", color: null },
      { flowerType: "Lá bạc", quantityEstimate: 5, unit: null, role: "foliage", color: null },
    ])
    expect(r.product.packaging).toMatchObject({ wrappingMaterial: "Giấy kraft", accessories: ["Nơ lụa"] })
    expect(r.passport).toMatchObject({ sellingPoints: ["Hoa tươi trong ngày"], recipient: "Người yêu", buyerPersona: "Nam 25–35", occasions: ["Valentine"] })
  })

  it("Thẻ chào đã chốt thắng: tên, phong cách, thành phần, giá, dịp do user chốt", () => {
    const r = projectApprovedProduct({ productId: "p1", productName: "SP-1", analysis, copy, pitch })
    expect(r.product).toMatchObject({ name: "Bó hồng Tình Yêu đặc biệt", style: "Lãng mạn", price: { exact: 650000 } })
    expect(r.product.components).toEqual([{ flowerType: "Hồng Ohara", quantityEstimate: 15, unit: "bông", role: "dominant", color: "hồng" }])
    expect(r.product.packaging.wrappingMaterial).toBe("Giấy lụa")
    expect(r.passport?.occasions).toEqual(["Sinh nhật"])
  })

  it("không có gì đã duyệt ngoài tên → không bịa thêm, passport rỗng", () => {
    const r = projectApprovedProduct({ productId: "p1", productName: "SP-1", analysis: null, copy: null, pitch: null })
    expect(r.product).toMatchObject({ name: "SP-1", style: null, components: [], price: { exact: null } })
    expect(r.passport).toBeNull()
  })
})
