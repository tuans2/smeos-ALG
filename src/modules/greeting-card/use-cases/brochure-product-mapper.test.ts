import { describe, expect, it } from "vitest"
import { collectImageAssetIds, toCatalogProduct, type CatalogItemRow } from "./brochure-product-mapper"

const item: CatalogItemRow = {
  sort_order: 0,
  product: {
    id: "p1",
    code: "B1",
    name: "Bó hồng",
    category: null,
    attributes: {
      pricing: {
        mode: "RANGE",
        dimensions: [{ key: "SIZE", label: "Kích cỡ", values: ["Nhỏ", "Lớn"] }],
        rows: [
          { values: ["Nhỏ"], price_vnd: 300000, peak_price_vnd: 350000, image_asset_id: "a-nho" },
          { values: ["Lớn"], price_vnd: 500000 },
        ],
      },
    },
    images: [{ asset_id: "a-main" }],
    variants: [],
  },
}

describe("toCatalogProduct — kiểu giá theo phiên bản", () => {
  it("giá thấp nhất, khoảng tới giá cao điểm cao nhất, ảnh phiên bản đã ký", () => {
    expect(collectImageAssetIds([item])).toEqual(["a-main", "a-nho"])
    const p = toCatalogProduct(item, new Map([["a-main", "/s/main"], ["a-nho", "/s/nho"]]))
    expect([p.priceMode, p.price, p.priceMaxVnd]).toEqual(["RANGE", 300000, 500000])
    expect(p.priceDimensions).toEqual([{ label: "Kích cỡ", values: ["Nhỏ", "Lớn"] }])
    expect(p.variants?.map((v) => [v.name, v.imageUrl])).toEqual([["Nhỏ", "/s/nho"], ["Lớn", null]])
  })
})
