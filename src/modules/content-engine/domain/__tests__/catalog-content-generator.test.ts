import { describe, it, expect } from "vitest"
import {
  generateCatalogContent,
  CATALOG_STYLE_OPTIONS,
  type CatalogContentInput,
} from "../catalog-content-generator"

describe("Catalog Content Generator (3 Styles)", () => {
  it("should have 3 distinct catalog style options", () => {
    expect(CATALOG_STYLE_OPTIONS).toHaveLength(3)
    const ids = CATALOG_STYLE_OPTIONS.map((o) => o.id)
    expect(ids).toContain("MODERN_SHOWROOM")
    expect(ids).toContain("EDITORIAL_LOOKBOOK")
    expect(ids).toContain("COMPACT_LIST")
  })

  it("should generate content for Editorial Lookbook style", () => {
    const input: CatalogContentInput = {
      shopName: "Flora Boutique",
      collectionName: "Sắc Hoa Mùa Thu",
      productCount: 12,
      styleVariant: "EDITORIAL_LOOKBOOK",
    }
    const result = generateCatalogContent(input)
    expect(result.styleVariant).toBe("EDITORIAL_LOOKBOOK")
    expect(result.badge).toBe("Bộ sưu tập chọn lọc")
    expect(result.description).toContain("12 mẫu của Flora Boutique")
  })

  it("should generate content for Compact List B2B style", () => {
    const input: CatalogContentInput = {
      shopName: "Flora Boutique",
      collectionName: "Hoa Khai Trương Doanh Nghiệp",
      productCount: 8,
      styleVariant: "COMPACT_LIST",
    }
    const result = generateCatalogContent(input)
    expect(result.styleVariant).toBe("COMPACT_LIST")
    expect(result.curatorNote).toContain("nhắn tiệm để được xác nhận")
  })

  it("should generate content for Modern Showroom style", () => {
    const input: CatalogContentInput = {
      shopName: "Flora Boutique",
      collectionName: "Bộ Sưu Tập Mới",
      productCount: 20,
      styleVariant: "MODERN_SHOWROOM",
    }
    const result = generateCatalogContent(input)
    expect(result.styleVariant).toBe("MODERN_SHOWROOM")
    expect(result.badge).toBe("Bộ sưu tập trực tuyến")
  })
})
