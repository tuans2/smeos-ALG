import { describe, it, expect } from "vitest"
import { resolveCatalogBrief } from "../resolve-catalog-brief"
import type { CatalogBrief, BrandProfile, CatalogProductItem } from "../../domain/entities/catalog-studio.types"

describe("resolveCatalogBrief Use Case", () => {
  const mockBrand: BrandProfile = {
    brandId: "brand-1",
    name: "Tiệm Hoa Siin",
    slogan: "Nghệ thuật hoa tươi đương đại",
    brandColors: { primary: "#9A3412" },
    contacts: { phone: "0901234567", zalo: "0901234567", address: "Hồ Chí Minh" },
  }

  const mockProducts: CatalogProductItem[] = [
    {
      productId: "p1",
      name: "Bó Hoa Hồng David Austin",
      code: "HOA-001",
      price: 850000,
      currency: "VND",
      primaryImage: "https://example.com/p1.jpg",
      sortOrder: 1,
      status: "ACTIVE",
    },
    {
      productId: "p2",
      name: "Bình Hoa Tulip Trắng Hà Lan",
      code: "HOA-002",
      price: 1200000,
      currency: "VND",
      primaryImage: "https://example.com/p2.jpg",
      sortOrder: 2,
      status: "ACTIVE",
    },
    {
      productId: "p3",
      name: "Hộp Hoa Mẫu Đơn Nhập Khẩu",
      code: "HOA-003",
      price: 1500000,
      currency: "VND",
      primaryImage: "https://example.com/p3.jpg",
      sortOrder: 3,
      status: "ACTIVE",
    },
  ]

  it("resolves T01 Signature Collection prototype with editorial structure", () => {
    const brief: CatalogBrief = {
      catalogId: "cat-1",
      title: "Bộ Sưu Tập Grand Opening",
      purpose: "COLLECTION",
      audience: "CONSUMER",
      language: "vi-VN",
      styleId: "S01_EDITORIAL_MAGAZINE",
      templateId: "T01_SIGNATURE_COLLECTION",
      pageSize: "A4_PORTRAIT",
      outputProfile: "DIGITAL_PDF",
      brandId: "brand-1",
      productIds: ["p1", "p2", "p3"],
    }

    const result = resolveCatalogBrief(brief, mockBrand, mockProducts)

    expect(result.isExportReady).toBe(true)
    expect(result.template.id).toBe("T01_SIGNATURE_COLLECTION")
    expect(result.style.id).toBe("S01_EDITORIAL_MAGAZINE")

    // Check page sequence: Cover -> Story -> Hero -> Grid -> Closing
    expect(result.pages.length).toBeGreaterThanOrEqual(4)
    expect(result.pages[0]?.layoutId).toBe("L01_COVER")
    expect(result.pages[1]?.layoutId).toBe("L02_BRAND_STORY")
    expect(result.pages[2]?.layoutId).toBe("L04_HERO_PRODUCT")
    expect(result.pages[result.pages.length - 1]?.layoutId).toBe("L08_CLOSING")
  })

  it("resolves T02 Minimal Product List with Nordic grid", () => {
    const brief: CatalogBrief = {
      catalogId: "cat-2",
      title: "Bảng Danh Mục Mẫu Mới",
      purpose: "COLLECTION",
      audience: "CONSUMER",
      language: "vi-VN",
      styleId: "S02_PURE_MINIMAL",
      templateId: "T02_MINIMAL_PRODUCT_LIST",
      pageSize: "A4_PORTRAIT",
      outputProfile: "DIGITAL_PDF",
      brandId: "brand-1",
      productIds: ["p1", "p2", "p3"],
    }

    const result = resolveCatalogBrief(brief, mockBrand, mockProducts)
    expect(result.template.id).toBe("T02_MINIMAL_PRODUCT_LIST")
    expect(result.style.id).toBe("S02_PURE_MINIMAL")
    expect(result.pages[0]?.layoutId).toBe("L01_COVER")
  })

  it("detects blocking issues when title or products are missing", () => {
    const brief: CatalogBrief = {
      catalogId: "cat-empty",
      title: "",
      purpose: "COLLECTION",
      audience: "CONSUMER",
      language: "vi-VN",
      styleId: "S01_EDITORIAL_MAGAZINE",
      pageSize: "A4_PORTRAIT",
      outputProfile: "DIGITAL_PDF",
      brandId: "brand-1",
      productIds: [],
    }

    const result = resolveCatalogBrief(brief, mockBrand, [])
    expect(result.isExportReady).toBe(false)
    expect(result.issues.some((i) => i.code === "EMPTY_CATALOG_TITLE")).toBe(true)
    expect(result.issues.some((i) => i.code === "NO_PRODUCTS_SELECTED")).toBe(true)
  })
})
