import { describe, expect, it } from "vitest"

import { classifyCatalogLink, isLandingFilters } from "../catalog-link-kind"

describe("classifyCatalogLink (PO 09/11/2026 — Quảng bá §3.2)", () => {
  it("store_official === true → trang chính thức, kể cả khi có archetype", () => {
    expect(classifyCatalogLink({ store_official: true, archetype: "warm-artisan", product_ids: ["p1"] })).toBe("OFFICIAL_LANDING")
  })

  it("store_official khác true (chuỗi, false) không được coi là trang chính thức", () => {
    expect(classifyCatalogLink({ store_official: "true", archetype: "a" })).toBe("CAMPAIGN_LANDING")
    expect(classifyCatalogLink({ store_official: false })).toBe("PUBLIC_COLLECTION")
  })

  it.each([
    ["occasion", { occasion: "valentine" }],
    ["archetype", { archetype: "minimal-luxury" }],
    ["generatedPackage", { generatedPackage: { headline: "x" } }],
  ])("landing chiến dịch theo dấu hiệu %s", (_name, filters) => {
    expect(isLandingFilters(filters)).toBe(true)
    expect(classifyCatalogLink(filters)).toBe("CAMPAIGN_LANDING")
  })

  it("bộ sưu tập chung: filters thường, rỗng, null hoặc sai kiểu", () => {
    expect(classifyCatalogLink({ product_ids: ["p1"], styleVariant: "MODERN_SHOWROOM" })).toBe("PUBLIC_COLLECTION")
    expect(classifyCatalogLink({})).toBe("PUBLIC_COLLECTION")
    expect(classifyCatalogLink(null)).toBe("PUBLIC_COLLECTION")
    expect(classifyCatalogLink(undefined)).toBe("PUBLIC_COLLECTION")
    expect(classifyCatalogLink("occasion")).toBe("PUBLIC_COLLECTION")
    expect(classifyCatalogLink(["occasion"])).toBe("PUBLIC_COLLECTION")
    expect(classifyCatalogLink({ occasion: "", archetype: null })).toBe("PUBLIC_COLLECTION")
  })
})
