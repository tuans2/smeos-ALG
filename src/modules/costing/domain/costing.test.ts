import { describe, expect, it } from "vitest"
import { FLORAL_INDUSTRY } from "@/modules/organization/domain/industries/floral"
import type { IndustryCostingSpec } from "@/modules/organization/domain/industry-costing-spec"
import { computeProductCost } from "./cost-calculator"
import { parseCostingOverrides, resolveCostConfig } from "./cost-config"
import type { Material, Recipe } from "./costing-types"
import { draftRecipeFromBom, normalizeMaterialName } from "./bom-adapters"
import { aggregateMaterialNeeds } from "./material-needs"
import { detectPriceChange } from "./price-change"
import { priceScenarios } from "./price-scenarios"

const spec = FLORAL_INDUSTRY.costing as IndustryCostingSpec
const config = resolveCostConfig(spec, FLORAL_INDUSTRY.craftFee, {})

const rose: Material = { id: "m1", name: "Hoa hồng", unit: "cành", categoryKey: "MAIN_FLOWER", unitCostVnd: 10_000, onHandQty: 5, active: true }
const leaf: Material = { id: "m2", name: "Lá bạc", unit: "nhánh", categoryKey: "FOLIAGE", unitCostVnd: 2_000, onHandQty: null, active: true }
const ribbon: Material = { id: "m3", name: "Ruy băng", unit: "mét", categoryKey: "WRAPPING", unitCostVnd: null, onHandQty: 0, active: true }
const recipe: Recipe = { productId: "p1", lines: [{ materialId: "m1", quantity: 10 }, { materialId: "m2", quantity: 5 }], wastePercent: null, laborMinutes: null }

describe("computeProductCost (#33)", () => {
  it("cộng nguyên liệu + hao hụt theo nhóm + công theo độ khó + chi phí chung", () => {
    const c = computeProductCost(recipe, [rose, leaf], config, "MEDIUM")
    expect(c.materialVnd).toBe(110_000)
    expect(c.wasteVnd).toBe(10_000 + 1_500) // hoa 10%, lá 15%
    expect(c.laborVnd).toBe(150_000)
    expect(c.overheadVnd).toBe(Math.round((110_000 + 11_500 + 150_000) * 0.1))
    expect(c.totalVnd).toBe(110_000 + 11_500 + 150_000 + c.overheadVnd)
    expect(c.complete).toBe(true)
  })

  it("thiếu đơn giá hoặc thiếu độ khó thì báo thiếu, không đoán số", () => {
    const c = computeProductCost({ ...recipe, lines: [...recipe.lines, { materialId: "m3", quantity: 1 }] }, [rose, leaf, ribbon], config, null)
    expect(c.missingPrices).toEqual(["Ruy băng"])
    expect(c.laborMissing).toBe(true)
    expect(c.complete).toBe(false)
    expect(c.lines.find((l) => l.materialId === "m3")?.lineCostVnd).toBeNull()
  })

  it("ngành tính công theo phút dùng đơn giá công/giờ của cửa hàng", () => {
    const perMinute = { ...config, laborModel: "PER_MINUTE" as const, laborRatePerHourVnd: 60_000 }
    expect(computeProductCost({ ...recipe, laborMinutes: 30 }, [rose, leaf], perMinute, null).laborVnd).toBe(30_000)
  })
})

describe("cấu hình chi phí", () => {
  it("cửa hàng ghi đè mặc định ngành; giá trị sai kiểu bị bỏ qua", () => {
    const o = parseCostingOverrides([
      { key: "overhead_percent", value: 20 },
      { key: "labor_rate_per_hour", value: "abc" },
      { key: "default_packaging_vnd", value: -5 },
    ])
    expect(o).toEqual({ overhead_percent: 20 })
    expect(resolveCostConfig(spec, FLORAL_INDUSTRY.craftFee, o).overheadPercent).toBe(20)
  })
})

describe("priceScenarios (#34)", () => {
  it("giá = giá vốn / (1 − biên), làm tròn lên bước của ngành, kèm giá hiện tại", () => {
    const s = priceScenarios({ costVnd: 300_000, presets: spec.priceScenarios, roundingVnd: spec.priceRoundingVnd, currentPriceVnd: 280_000 })
    expect(s.find((x) => x.key === "SAFE")?.priceVnd).toBe(600_000)
    expect(s.find((x) => x.key === "RECOMMENDED")?.priceVnd).toBe(500_000)
    const current = s.find((x) => x.key === "CURRENT")
    expect(current?.profitVnd).toBe(-20_000)
    expect(current?.warnings).toContain("Giá này đang lỗ so với giá vốn")
  })

  it("không có giá vốn thì không đề xuất", () => {
    expect(priceScenarios({ costVnd: 0, presets: spec.priceScenarios, roundingVnd: 1000 })).toEqual([])
  })
})

describe("aggregateMaterialNeeds (#35)", () => {
  it("cộng dồn theo đơn × định mức × hao hụt, trừ tồn, liệt kê mẫu thiếu công thức", () => {
    const r = aggregateMaterialNeeds(
      [{ orderId: "o1", productId: "p1", quantity: 2 }, { orderId: "o2", productId: "p9", quantity: 1 }],
      new Map([["p1", recipe]]),
      [rose, leaf],
      config.wastePercentByCategory,
    )
    const roseNeed = r.needs.find((n) => n.materialId === "m1")
    expect(roseNeed?.requiredQty).toBe(22) // 2 × 10 × 1.1
    expect(roseNeed?.toBuyQty).toBe(17) // trừ tồn 5
    expect(r.productsWithoutRecipe).toEqual(["p9"])
    expect(r.costIncomplete).toBe(false)
  })
})

describe("detectPriceChange (#32)", () => {
  it("cảnh báo khi đổi giá vượt ngưỡng", () => {
    const c = detectPriceChange(
      [{ unitCostVnd: 10_000, effectiveAt: new Date("2026-10-01") }, { unitCostVnd: 12_000, effectiveAt: new Date("2026-10-20") }],
      spec.priceChangeAlertPercent,
    )
    expect(c).toMatchObject({ previousVnd: 10_000, currentVnd: 12_000, changePercent: 20, alert: true })
    expect(detectPriceChange([{ unitCostVnd: 1, effectiveAt: new Date() }], 15)).toBeNull()
  })
})

describe("BOM AI → công thức nháp (#31)", () => {
  it("ngành hoa: ghép tên không dấu với nguyên liệu, gộp dòng trùng, dòng chưa ghép để người dùng chọn", () => {
    const bom = { flowers: [{ name: "Hoa Hồng", quantity: 7, role: "Chủ đạo" }, { name: "hoa hong", quantity: 3 }], foliage: [{ name: "Lá chanh", quantity: 2 }] }
    const lines = draftRecipeFromBom(bom, spec, [rose, leaf])
    expect(lines.find((l) => l.materialId === "m1")?.quantity).toBe(10)
    expect(lines.find((l) => l.name === "Lá chanh")).toMatchObject({ materialId: null, categoryKey: "FOLIAGE" })
    expect(normalizeMaterialName("  Đá  Quý ")).toBe("da quy")
  })
})
