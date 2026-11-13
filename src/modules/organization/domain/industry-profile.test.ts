import { describe, it, expect } from "vitest"
import {
  DEFAULT_INDUSTRY,
  INDUSTRY_CATALOG,
  getIndustryDefinition,
  getIndustryTerminology,
  listAllIndustries,
  type IndustryKey,
} from "./industry-profile"

describe("IndustryProfile Domain", () => {
  it("trả về đúng số lượng 7 ngành chính đã khai báo", () => {
    const all = listAllIndustries()
    expect(all.length).toBe(7)
    expect(all.map((i) => i.key)).toEqual([
      "FLORAL",
      "FASHION",
      "FNB",
      "CRAFT_GIFT",
      "RETAIL_GENERAL",
      "SERVICES",
      "HOMESTAY",
    ])
  })

  it("ngành mặc định luôn là FLORAL để tương thích ngược 100%", () => {
    expect(DEFAULT_INDUSTRY).toBe("FLORAL")
    const fallbackDef = getIndustryDefinition(null)
    expect(fallbackDef.key).toBe("FLORAL")
    expect(fallbackDef.terms.makerTitle).toBe("Thợ chế tác")
  })

  it("trả về định nghĩa chính xác cho ngành FASHION", () => {
    const fashionDef = getIndustryDefinition("FASHION")
    expect(fashionDef.key).toBe("FASHION")
    expect(fashionDef.terms.makerTitle).toBe("Thợ may / Kỹ thuật cắt")
    expect(fashionDef.terms.rawMaterialItem).toBe("Vải / Phụ liệu")
    expect(fashionDef.terms.defaultMeasurementUnits).toContain("mét")
  })

  it("trả về định nghĩa chính xác cho ngành FNB", () => {
    const fnbTerms = getIndustryTerminology("FNB")
    expect(fnbTerms.makerTitle).toContain("Đầu bếp")
    expect(fnbTerms.productRecipe).toBe("Công thức định lượng món")
    expect(fnbTerms.defaultMeasurementUnits).toContain("gram")
  })

  it("tự động lùi về FLORAL nếu truyền ngành không hợp lệ", () => {
    const invalidTerms = getIndustryTerminology("UNKNOWN_INDUSTRY_XYZ")
    expect(invalidTerms.makerTitle).toBe("Thợ chế tác")
  })

  it("mỗi ngành đều có đủ các trường bắt buộc trong IndustryTerminology", () => {
    for (const [key, def] of Object.entries(INDUSTRY_CATALOG)) {
      const terms = def.terms
      expect(terms.makerTitle).toBeTruthy()
      expect(terms.makerAction).toBeTruthy()
      expect(terms.productRecipe).toBeTruthy()
      expect(terms.sampleProduct).toBeTruthy()
      expect(terms.rawMaterialItem).toBeTruthy()
      expect(terms.completedProductPhoto).toBeTruthy()
      expect(terms.printablesTitle).toBeTruthy()
      expect(terms.defaultMeasurementUnits.length).toBeGreaterThan(0)
      expect(terms.defaultComponentRoles.length).toBeGreaterThan(0)
    }
  })
})
