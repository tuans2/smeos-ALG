import { describe, expect, it } from "vitest"
import { listAllIndustryPlugins } from "./industry-profile"

/** Nhóm công cụ 6 — mọi ngành khai hồ sơ tính giá hợp lệ hoặc `null` (chưa hỗ trợ). */
describe("IndustryCostingSpec", () => {
  it("ngành hoa là ngành chuẩn đầu tiên có hồ sơ tính giá đầy đủ", () => {
    const floral = listAllIndustryPlugins().find((p) => p.identity.key === "FLORAL")
    expect(floral?.costing?.bomAdapter).toBe("FLORAL_VISION")
    expect(floral?.costing?.perishable).toBe(true)
  })

  it("mọi hồ sơ khai báo đều nhất quán", () => {
    for (const plugin of listAllIndustryPlugins()) {
      const c = plugin.costing
      if (c === null) continue
      const keys = c.materialCategories.map((m) => m.key)
      expect(new Set(keys).size).toBe(keys.length)
      for (const m of c.materialCategories) {
        expect(m.defaultWastePercent).toBeGreaterThanOrEqual(0)
        expect(m.defaultWastePercent).toBeLessThan(100)
      }
      for (const s of c.starterMaterials) expect(keys).toContain(s.categoryKey)
      expect(c.priceScenarios.map((s) => s.key).sort()).toEqual(["COMPETITIVE", "RECOMMENDED", "SAFE"])
      for (const s of c.priceScenarios) {
        expect(s.marginPercent).toBeGreaterThan(0)
        expect(s.marginPercent).toBeLessThan(100)
      }
      expect(c.priceRoundingVnd).toBeGreaterThan(0)
      if (c.laborModel === "PER_COMPLEXITY") expect(plugin.craftFee).not.toBeNull()
    }
  })
})
