import { describe, expect, it } from "vitest"
import { CATALOG_TEMPLATES } from "@/modules/catalog-studio/domain/templates/template-registry"
import { resolveCatalogBrief } from "@/modules/catalog-studio/use-cases/resolve-catalog-brief"
import type { CatalogBrief, CatalogProductItem, BrandProfile } from "@/modules/catalog-studio/domain/entities/catalog-studio.types"

const products = [0, 1, 2, 3, 4].map((i) => ({
  productId: `p${i}`, name: `Mẫu ${i}`, code: `M${i}`, category: i % 2 ? "Bó hoa" : "Giỏ hoa", primaryImage: `/a${i}.jpg`, price: 100000, currency: "VND", status: "ACTIVE",
})) as unknown as CatalogProductItem[]
const brand = { brandId: "b", name: "Tiệm A", brandColors: {}, contacts: {} } as unknown as BrandProfile

/** Màn chọn mẫu ghi "Gồm N loại trang" — phải đúng các loại trang PDF thực sự sinh ra. */
describe("cấu trúc mẫu catalog khớp trang PDF thật", () => {
  for (const tpl of Object.values(CATALOG_TEMPLATES)) {
    it(tpl.id, () => {
      const brief = { catalogId: "c", title: "BST", templateId: tpl.id, styleId: tpl.defaultStyleId, productIds: [] } as unknown as CatalogBrief
      const pages = resolveCatalogBrief(brief, brand, products).pages
      expect([...new Set(pages.map((p) => p.layoutId))].sort()).toEqual([...new Set(tpl.structure.map((s) => s.layoutId))].sort())
    })
  }

  it("trang PDF mặc định không tự hứa hóa đơn / giao đúng hẹn", () => {
    const brief = { catalogId: "c", title: "BST", templateId: "T01_SIGNATURE_COLLECTION", styleId: "S01_EDITORIAL_MAGAZINE", productIds: [] } as unknown as CatalogBrief
    const text = JSON.stringify(resolveCatalogBrief(brief, brand, products).pages)
    expect(text).not.toMatch(/VAT|đúng hẹn|độc bản/)
  })
})

describe("chia trang PDF", () => {
  it("phân chương chỉ khi có từ 2 nhóm; trang chi tiết tối đa 4", async () => {
    const { planProductPages, MAX_DETAIL_PAGES } = await import("@/modules/catalog-studio/domain/page-planner")
    const one = products.map((p) => ({ ...p, category: "Bó hoa" }))
    const opts = { itemsPerPage: 4, withDividers: true, withDetails: true, collectionTitle: "BST" }
    expect(planProductPages(one, opts).some((p) => p.layoutId === "L03_COLLECTION_DIVIDER")).toBe(false)
    const planned = planProductPages(products, opts)
    expect(planned.filter((p) => p.layoutId === "L03_COLLECTION_DIVIDER").map((p) => p.title).sort()).toEqual(["Bó hoa", "Giỏ hoa"])
    expect(planned.filter((p) => p.layoutId === "L06_PRODUCT_DETAIL")).toHaveLength(MAX_DETAIL_PAGES)
    const gridCount = planned.filter((p) => p.layoutId === "L05_PRODUCT_GRID").flatMap((p) => p.products).length
    expect(gridCount).toBe(products.length)
  })
})
