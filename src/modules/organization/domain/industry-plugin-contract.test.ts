import { describe, it, expect } from "vitest"
import {
  INDUSTRY_REGISTRY,
  getIndustryPlugin,
  listAllIndustryPlugins,
} from "./industry-profile"

describe("IndustryPluginContract SSOT Verification", () => {
  it("đăng ký đầy đủ 7 ngành trong INDUSTRY_REGISTRY", () => {
    const plugins = listAllIndustryPlugins()
    expect(plugins.length).toBe(7)
    const keys = plugins.map((p) => p.identity.key)
    expect(keys).toContain("FLORAL")
    expect(keys).toContain("FASHION")
    expect(keys).toContain("FNB")
    expect(keys).toContain("CRAFT_GIFT")
    expect(keys).toContain("RETAIL_GENERAL")
    expect(keys).toContain("SERVICES")
    expect(keys).toContain("HOMESTAY")
  })

  it("mỗi ngành tuân thủ tuyệt đối 6 khối thành phần chuẩn mực", () => {
    for (const [key, plugin] of Object.entries(INDUSTRY_REGISTRY)) {
      // 1. Identity
      expect(plugin.identity.key).toBe(key)
      expect(plugin.identity.name).toBeTruthy()
      expect(plugin.identity.description).toBeTruthy()
      expect(plugin.identity.iconName).toBeTruthy()

      // 2. Terminology
      expect(plugin.terminology.makerTitle).toBeTruthy()
      expect(plugin.terminology.makerAction).toBeTruthy()
      expect(plugin.terminology.productRecipe).toBeTruthy()
      expect(plugin.terminology.catalogTitle).toBeTruthy()
      expect(plugin.terminology.createButtonLabel).toBeTruthy()
      expect(plugin.terminology.scanButtonLabel).toBeTruthy()

      // 3. Taxonomy
      expect(plugin.taxonomy.defaultCategories.length).toBeGreaterThan(0)
      for (const cat of plugin.taxonomy.defaultCategories) {
        expect(cat.key).toBeTruthy()
        expect(cat.label).toBeTruthy()
        expect(cat.defaultUnit).toBeTruthy()
      }
      expect(plugin.taxonomy.occasions.length).toBeGreaterThan(0)
      expect(plugin.taxonomy.priceRanges.length).toBeGreaterThan(0)

      // 4. BOM Spec
      expect(plugin.bomSpec.measurementUnits.length).toBeGreaterThan(0)
      expect(plugin.bomSpec.componentRoles.length).toBeGreaterThan(0)

      // 5. Templates Spec
      expect(plugin.templates.printables.length).toBeGreaterThan(0)
      for (const p of plugin.templates.printables) {
        expect(p.type).toBeTruthy()
        expect(p.title).toBeTruthy()
        expect(p.defaultFrontTitle).toBeTruthy()
        expect(p.defaultBackInstructions.length).toBeGreaterThan(0)
      }

      // 6. AI Config
      expect(plugin.aiConfig.visionFocus).toBeTruthy()
      expect(plugin.aiConfig.studioBackgroundStyles.length).toBeGreaterThan(0)
      expect(plugin.aiConfig.marketingToneExamples.length).toBeGreaterThan(0)
      expect(plugin.aiConfig.sampleProductNames.length).toBeGreaterThan(0)
    }
  })

  it("ngành FLORAL có đúng danh mục và template in ấn đặc thù", () => {
    const floral = getIndustryPlugin("FLORAL")
    expect(floral.taxonomy.defaultCategories.map((c) => c.key)).toContain("BOUQUET")
    expect(floral.templates.printables.some((p) => p.type === "CARD")).toBe(true)
  })

  it("ngành FASHION có đúng danh mục và template thẻ bài treo Price Tag", () => {
    const fashion = getIndustryPlugin("FASHION")
    expect(fashion.taxonomy.defaultCategories.map((c) => c.key)).toContain("DRESS")
    expect(fashion.templates.printables.some((p) => p.type === "TAG")).toBe(true)
    expect(fashion.bomSpec.measurementUnits).toContain("mét")
  })

  it("ngành FNB có đúng danh mục đồ uống/món ăn và template Menu để bàn", () => {
    const fnb = getIndustryPlugin("FNB")
    expect(fnb.taxonomy.defaultCategories.map((c) => c.key)).toContain("COFFEE")
    expect(fnb.templates.printables.some((p) => p.type === "MENU")).toBe(true)
    expect(fnb.bomSpec.measurementUnits).toContain("gram")
  })

  it("mỗi ngành có gợi ý nhóm đặc điểm cho giá theo phiên bản", () => {
    for (const plugin of Object.values(INDUSTRY_REGISTRY)) {
      const dims = plugin.taxonomy.pricingPresets.variantDimensions
      expect(dims.length).toBeGreaterThanOrEqual(3)
      expect(new Set(dims.map((d) => d.key)).size).toBe(dims.length)
      for (const d of dims) expect(d.values.length).toBeGreaterThanOrEqual(3)
    }
  })
})
