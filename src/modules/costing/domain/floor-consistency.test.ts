import { describe, expect, it } from "vitest"
import { FLORAL_INDUSTRY } from "@/modules/organization/domain/industries/floral"
import type { IndustryCostingSpec } from "@/modules/organization/domain/industry-costing-spec"
import { computeProductCost } from "./cost-calculator"
import { resolveCostConfig } from "./cost-config"
import type { Material, Recipe } from "./costing-types"
import { floorPriceVnd } from "./price-floor"
import { priceScenarios } from "./price-scenarios"

/** Audit BL-07 (06/11/2026): sàn "mở" khi thiếu dữ liệu và lệch làm tròn giữa cảnh báo và chặn thật. */
const config = resolveCostConfig(FLORAL_INDUSTRY.costing as IndustryCostingSpec, FLORAL_INDUSTRY.craftFee, {})
const rose: Material = { id: "m1", name: "Hoa hồng", unit: "cành", categoryKey: "MAIN_FLOWER", unitCostVnd: 10_000, onHandQty: 5, active: true }

describe("giá vốn — nguyên liệu không còn", () => {
  it("dòng công thức trỏ tới nguyên liệu đã xoá → thiếu giá, không coi là đủ", () => {
    const recipe: Recipe = { productId: "p1", lines: [{ materialId: "m1", quantity: 10 }, { materialId: "gone", quantity: 3 }], wastePercent: null, laborMinutes: null }
    const cost = computeProductCost(recipe, [rose], config, "EASY")
    expect(cost.complete).toBe(false)
    expect(cost.missingPrices).toHaveLength(1)
  })
})

describe("cảnh báo sàn dùng đúng cách làm tròn của chặn thật", () => {
  it("giá nằm giữa sàn thô và sàn đã làm tròn lên → có cảnh báo (vì chặn thật sẽ chặn)", () => {
    const costVnd = 100_100
    const floorRatio = 1.2 // sàn thô 120.120 → sàn chặn 121.000
    expect(floorPriceVnd(costVnd, floorRatio)).toBe(121_000)
    const [current] = priceScenarios({ costVnd, presets: [], roundingVnd: 1000, currentPriceVnd: 120_500, floorRatio })
    expect(current?.warnings).toContain("Thấp hơn giá sàn của cửa hàng")
  })
})

describe("giá trần (PO 07/11/2026, Q3)", () => {
  it("làm tròn XUỐNG nghìn — trần không cao hơn thật", async () => {
    const { ceilingPriceVnd, aboveCeilingMessage } = await import("./price-floor")
    expect(ceilingPriceVnd(100_100, 3)).toBe(300_000)
    expect(aboveCeilingMessage(300_000, 300_000)).toBeNull()
    expect(aboveCeilingMessage(301_000, 300_000)).toContain("giá trần")
    expect(aboveCeilingMessage(999_000, 0)).toBeNull()
  })
})
