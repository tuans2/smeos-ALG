import type { IndustryCostingSpec } from "@/modules/organization/domain/industry-costing-spec"
import type { IndustryCraftFeeSpec } from "@/modules/organization/domain/industry-plugin-contract"
import type { CostConfig } from "./costing-types"

/** Khoá trong `pricing_rules` mà cửa hàng có thể ghi đè mặc định của ngành (Nhóm 6). */
export const COSTING_RULE_KEYS = [
  "labor_rate_per_hour",
  "overhead_percent",
  "default_packaging_vnd",
  "price_change_alert_percent",
] as const
export type CostingRuleKey = (typeof COSTING_RULE_KEYS)[number]

export type CostingOverrides = Partial<Record<CostingRuleKey, number>>

const num = (v: unknown, min: number, max: number): number | undefined =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : undefined

/** Đọc giá trị ghi đè từ dòng `pricing_rules` (key → value JSON); giá trị sai kiểu bị bỏ qua. */
export function parseCostingOverrides(rows: readonly { key: string; value: unknown }[]): CostingOverrides {
  const out: CostingOverrides = {}
  for (const r of rows) {
    if (r.key === "labor_rate_per_hour") {
      const v = num(r.value, 0, 10_000_000)
      if (v !== undefined) out.labor_rate_per_hour = v
    } else if (r.key === "overhead_percent") {
      const v = num(r.value, 0, 100)
      if (v !== undefined) out.overhead_percent = v
    } else if (r.key === "default_packaging_vnd") {
      const v = num(r.value, 0, 100_000_000)
      if (v !== undefined) out.default_packaging_vnd = v
    } else if (r.key === "price_change_alert_percent") {
      const v = num(r.value, 1, 100)
      if (v !== undefined) out.price_change_alert_percent = v
    }
  }
  return out
}

/** Cấu hình chi phí hiệu lực = hồ sơ ngành ⊕ ghi đè của cửa hàng. */
export function resolveCostConfig(
  spec: IndustryCostingSpec,
  craftFee: IndustryCraftFeeSpec | null,
  overrides: CostingOverrides,
): CostConfig {
  return {
    laborModel: spec.laborModel,
    laborRatePerHourVnd: overrides.labor_rate_per_hour ?? null,
    laborByComplexityVnd: craftFee?.laborByComplexityVnd ?? null,
    overheadPercent: overrides.overhead_percent ?? spec.defaultOverheadPercent,
    packagingVnd: overrides.default_packaging_vnd ?? spec.defaultPackagingVnd,
    wastePercentByCategory: Object.fromEntries(spec.materialCategories.map((c) => [c.key, c.defaultWastePercent])),
  }
}
