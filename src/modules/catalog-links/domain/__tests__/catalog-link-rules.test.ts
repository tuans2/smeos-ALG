import { describe, it, expect } from "vitest"
import {
  validateSlug,
  validateFilters,
  normalizeSlug,
  SLUG_REGEX,
} from "@/modules/catalog-links/domain/catalog-link-rules"
import type { CatalogLinkFilters } from "@/modules/catalog-links/domain/catalog-link-rules"

describe("catalog-link-rules", () => {
  describe("validateSlug", () => {
    it("accepts valid slug", () => {
      expect(validateSlug("catalog-2024")).toBe("")
      expect(validateSlug("abc")).toBe("")
      expect(validateSlug("a-b-c")).toBe("")
      expect(validateSlug("catalog123")).toBe("")
    })

    it("rejects too short slug", () => {
      expect(validateSlug("ab")).toBe("Slug tối thiểu 3 ký tự")
      expect(validateSlug("")).toBe("Slug tối thiểu 3 ký tự")
    })

    it("rejects too long slug", () => {
      const longSlug = "a".repeat(101)
      expect(validateSlug(longSlug)).toBe("Slug tối đa 100 ký tự")
    })

    it("rejects invalid characters", () => {
      expect(validateSlug("Catalog 2024")).toBe("Slug chỉ chứa chữ cái thường, số và dấu gạch ngang (a-z, 0-9, -)")
      expect(validateSlug("catalog_2024")).toBe("Slug chỉ chứa chữ cái thường, số và dấu gạch ngang (a-z, 0-9, -)")
      expect(validateSlug("catalog.2024")).toBe("Slug chỉ chứa chữ cái thường, số và dấu gạch ngang (a-z, 0-9, -)")
      expect(validateSlug("catalog@2024")).toBe("Slug chỉ chứa chữ cái thường, số và dấu gạch ngang (a-z, 0-9, -)")
    })
  })

  describe("validateFilters", () => {
    it("accepts empty filters", () => {
      expect(validateFilters({} as CatalogLinkFilters)).toBe("")
    })

    it("accepts valid filters", () => {
      const filters: CatalogLinkFilters = {
        occasionCodes: ["valentine"],
        colorCodes: ["red"],
        collections: ["wedding"],
        priceRange: { min: 100000, max: 500000 },
      }
      expect(validateFilters(filters)).toBe("")
    })

    it("rejects negative price_min", () => {
      expect(validateFilters({ priceRange: { min: -100 } } as CatalogLinkFilters)).toBe("priceRange.min phải là số không âm")
    })

    it("rejects negative price_max", () => {
      expect(validateFilters({ priceRange: { max: -100 } } as CatalogLinkFilters)).toBe("priceRange.max phải là số không âm")
    })

    it("rejects price_max < price_min", () => {
      expect(validateFilters({ priceRange: { min: 500000, max: 100000 } } as CatalogLinkFilters)).toBe("priceRange.max phải lớn hơn hoặc bằng min")
    })
  })

  describe("normalizeSlug", () => {
    it("normalizes text", () => {
      expect(normalizeSlug("Catalog 20/10")).toBe("catalog-20-10")
      expect(normalizeSlug("Test Catalog")).toBe("test-catalog")
      expect(normalizeSlug("  Test  Catalog  ")).toBe("test-catalog")
    })

    it("handles special characters", () => {
      expect(normalizeSlug("Catalog@#$%")).toBe("catalog")
      expect(normalizeSlug("A---B")).toBe("a-b")
    })
  })

  describe("SLUG_REGEX", () => {
    it("matches valid slugs", () => {
      expect(SLUG_REGEX.test("catalog-2024")).toBe(true)
      expect(SLUG_REGEX.test("abc")).toBe(true)
      expect(SLUG_REGEX.test("a-b-c")).toBe(true)
      expect(SLUG_REGEX.test("catalog123")).toBe(true)
    })

    it("rejects invalid slugs", () => {
      expect(SLUG_REGEX.test("Catalog")).toBe(false)
      expect(SLUG_REGEX.test("catalog_2024")).toBe(false)
      expect(SLUG_REGEX.test("catalog.2024")).toBe(false)
      expect(SLUG_REGEX.test("-catalog")).toBe(false)
      expect(SLUG_REGEX.test("catalog-")).toBe(false)
      expect(SLUG_REGEX.test("a--b")).toBe(false)
    })
  })
})