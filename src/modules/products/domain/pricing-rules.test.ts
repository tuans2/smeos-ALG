import { describe, expect, it } from "vitest"

import {
  DEFAULT_OPTIMAL_PRICE_RATIO,
  DEFAULT_PARTNER_TIER_BONUS,
  mergeEffectiveFloorCeilingRatio,
  mergeEffectivePricingConfig,
  validatePricingRuleValue,
  type PricingRuleRow,
} from "./pricing-rules"

describe("mergeEffectivePricingConfig", () => {
  it("chưa cấu hình gì thì dùng mặc định", () => {
    const config = mergeEffectivePricingConfig([], null)
    expect(config.partnerTierBonus).toEqual(DEFAULT_PARTNER_TIER_BONUS)
    expect(config.optimalPriceRatio).toBe(DEFAULT_OPTIMAL_PRICE_RATIO)
  })

  it("dòng phạm vi tổ chức ghi đè mặc định", () => {
    const rows: PricingRuleRow[] = [
      { key: "optimal_price_ratio", value: 0.6, branch_id: null },
    ]
    expect(mergeEffectivePricingConfig(rows, null).optimalPriceRatio).toBe(0.6)
  })

  it("dòng phạm vi chi nhánh ghi đè dòng phạm vi tổ chức, chỉ khi hỏi đúng chi nhánh đó", () => {
    const rows: PricingRuleRow[] = [
      { key: "optimal_price_ratio", value: 0.5, branch_id: null },
      { key: "optimal_price_ratio", value: 0.7, branch_id: "chi-nhanh-1" },
    ]
    expect(mergeEffectivePricingConfig(rows, "chi-nhanh-1").optimalPriceRatio).toBe(0.7)
    expect(mergeEffectivePricingConfig(rows, "chi-nhanh-2").optimalPriceRatio).toBe(0.5)
    expect(mergeEffectivePricingConfig(rows, null).optimalPriceRatio).toBe(0.5)
  })
})

describe("mergeEffectiveFloorCeilingRatio", () => {
  it("chưa cấu hình thì floorRatio/ceilingRatio đều 0 (không đặt Sàn/Trần)", () => {
    expect(mergeEffectiveFloorCeilingRatio([], null)).toEqual({ floorRatio: 0, ceilingRatio: 0 })
  })

  it("chi nhánh ghi đè tổ chức", () => {
    const rows: PricingRuleRow[] = [
      { key: "floor_ceiling_ratio", value: { floorRatio: 1, ceilingRatio: 1.5 }, branch_id: null },
      {
        key: "floor_ceiling_ratio",
        value: { floorRatio: 1.1, ceilingRatio: 1.8 },
        branch_id: "chi-nhanh-1",
      },
    ]
    expect(mergeEffectiveFloorCeilingRatio(rows, "chi-nhanh-1")).toEqual({
      floorRatio: 1.1,
      ceilingRatio: 1.8,
    })
    expect(mergeEffectiveFloorCeilingRatio(rows, null)).toEqual({ floorRatio: 1, ceilingRatio: 1.5 })
  })
})

describe("validatePricingRuleValue", () => {
  it("partner_tier_bonus: object số không âm thì hợp lệ", () => {
    expect(validatePricingRuleValue("partner_tier_bonus", { Growth: 0, Premium: 0.1 })).toBe("")
    expect(validatePricingRuleValue("partner_tier_bonus", { Growth: -0.1 })).not.toBe("")
    expect(validatePricingRuleValue("partner_tier_bonus", [1, 2])).not.toBe("")
  })

  it("surcharge_groups: mảng nhóm đúng hình dạng thì hợp lệ", () => {
    const ok = [{ id: "a", name: "A", options: [{ label: "Không", value: 0 }] }]
    expect(validatePricingRuleValue("surcharge_groups", ok)).toBe("")
    expect(validatePricingRuleValue("surcharge_groups", [{ id: "a" }])).not.toBe("")
    expect(validatePricingRuleValue("surcharge_groups", "không phải mảng")).not.toBe("")
  })

  it("optimal_price_ratio: số trong [0,1] thì hợp lệ", () => {
    expect(validatePricingRuleValue("optimal_price_ratio", 0.5)).toBe("")
    expect(validatePricingRuleValue("optimal_price_ratio", 1.5)).not.toBe("")
    expect(validatePricingRuleValue("optimal_price_ratio", -0.1)).not.toBe("")
  })

  it("floor_ceiling_ratio: ceilingRatio phải >= floorRatio khi cả hai cùng khai", () => {
    expect(validatePricingRuleValue("floor_ceiling_ratio", { floorRatio: 1, ceilingRatio: 1.5 })).toBe(
      ""
    )
    expect(
      validatePricingRuleValue("floor_ceiling_ratio", { floorRatio: 1.5, ceilingRatio: 1 })
    ).not.toBe("")
    // Chỉ khai Sàn (ceilingRatio = 0, nghĩa là không đặt Trần) vẫn hợp lệ.
    expect(validatePricingRuleValue("floor_ceiling_ratio", { floorRatio: 1, ceilingRatio: 0 })).toBe("")
  })
})
