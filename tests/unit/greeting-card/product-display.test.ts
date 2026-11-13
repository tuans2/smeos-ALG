import { describe, expect, it } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import type { GreetingCatalogProduct } from "@/modules/greeting-card/domain/greeting-card-types"
import { GreetingTemplateRenderer } from "@/components/greeting-card/customer/templates/greeting-template-renderer"
import { GREETING_TEMPLATE_LIST } from "@/modules/greeting-card/domain/greeting-template-registry"
import {
  comparisonRows,
  toProductDisplay,
} from "@/components/greeting-card/customer/templates/product-info/product-display"
import { OPTIONAL_DISPLAY_FIELDS } from "@/modules/greeting-card/domain/display-fields"

const product: GreetingCatalogProduct = {
  id: "p1",
  code: "ML-01",
  name: "Kệ hoa khai trương Đại Cát",
  price: 1_950_000,
  imageUrl: null,
  flowersSummary: "Hồng đỏ, lan vũ nữ",
  occasion: "Khai trương",
  style: "Sang trọng",
  category: "Kệ khai trương",
  color: "Đỏ",
  dimensions: "Cao 160 cm · Rộng 60 cm",
  wrapStyle: "Giấy lụa đỏ",
  meaning: "Chúc làm ăn phát đạt",
  sortOrder: 0,
}

describe("thông tin sản phẩm dùng chung", () => {
  it("dựng đủ trường theo một nguồn duy nhất", () => {
    const d = toProductDisplay(product)
    expect(d.priceLabel).toBe("1.950.000 ₫")
    expect(d.summary).toBe("Hồng đỏ, lan vũ nữ")
    expect(d.code).toBe("ML-01")
    expect(d.tags).toEqual(["Kệ khai trương", "Sang trọng", "Đỏ"])
    expect(d.story).toBe("Chúc làm ăn phát đạt")
    expect(d.specs.map((s) => s.label)).toEqual(
      OPTIONAL_DISPLAY_FIELDS.filter((f) => f.key !== "description").map((f) => f.label),
    )
  })

  it("chưa có giá thì hiện Liên hệ, bỏ trống thì ẩn dòng", () => {
    const d = toProductDisplay({ ...product, price: 0, style: "  ", color: null })
    expect(d.priceLabel).toBe("Liên hệ")
    expect(d.tags).toEqual(["Kệ khai trương"])
    expect(d.specs.find((s) => s.label === "Phong cách")).toBeUndefined()
  })

  it("tắt trường thì ẩn ở mọi mức; mã, tên, giá luôn còn", () => {
    const d = toProductDisplay(product, ["dimensions"])
    expect(d.summary).toBeNull()
    expect(d.tags).toEqual([])
    expect(d.story).toBeNull()
    expect(d.specs).toEqual([{ label: "Kích thước", value: "Cao 160 cm · Rộng 60 cm" }])
    expect([d.title, d.code, d.priceLabel]).toEqual([product.name, "ML-01", "1.950.000 ₫"])
    expect(comparisonRows(["dimensions"]).map((r) => r.label)).toEqual(["Giá", "Mã mẫu", "Kích thước"])
  })

  it("mọi mẫu (cả 20) đều hiện cùng tên và cùng nhãn giá", () => {
    for (const tpl of GREETING_TEMPLATE_LIST) {
      const html = renderToStaticMarkup(
        createElement(GreetingTemplateRenderer, {
          templateId: tpl.id,
          products: [product],
          catalogName: "BST",
          selectedProductId: null,
          onSelectProduct: () => {},
        }),
      )
      expect(html, tpl.id).toContain(product.name)
      expect(html, tpl.id).toContain("1.950.000 ₫")
      expect(html, tpl.id).toContain("ML-01")
    }
  })
})
