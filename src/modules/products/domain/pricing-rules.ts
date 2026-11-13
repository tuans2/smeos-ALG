/**
 * Danh mục khoá `pricing_rules` + giá trị mặc định + luật hợp nhất tổ chức/
 * chi nhánh. `pricing_rules` (đặc tả 07 mục 9, dựng sẵn từ P3) theo tổ chức,
 * **có thể theo chi nhánh** — Checklist P6 mục 2.
 *
 * Bốn khoá dưới đây là phần cấu hình CỐT LÕI của `quotePrice`/`checkPriceGuard`
 * (`pricing.ts`/`price-guard.ts`) — không mang theo phần cấu hình rộng hơn
 * của `cauHinhMacDinh.ts` bản gốc (nhãn ưu tiên giao hàng, chu kỳ thanh toán,
 * danh mục phụ kiện…), vì những thứ đó thuộc luồng "thẻ chào giá" ngoài phạm
 * vi P6.
 */

import type { PartnerTierBonus, PricingConfig, SurchargeGroup } from "./pricing"
import { MAX_TIER_DISCOUNT_RATIO, isCustomerTier, parsePeakHours } from "./customer-tier-pricing"

export const PRICING_RULE_KEYS = [
  "partner_tier_bonus",
  "surcharge_groups",
  "optimal_price_ratio",
  "floor_ceiling_ratio",
  // Nhóm công cụ 6 — cửa hàng ghi đè mặc định ngành (costing/domain/cost-config.ts).
  "labor_rate_per_hour",
  "overhead_percent",
  "default_packaging_vnd",
  "price_change_alert_percent",
  // Checklist ALG 3.1 — chiết khấu theo hạng khách, phụ phí giờ cao điểm (customer-tier-pricing.ts)
  "customer_tier_discount",
  "peak_hour_surcharge",
] as const

export type PricingRuleKey = (typeof PRICING_RULE_KEYS)[number]

export function isPricingRuleKey(key: string): key is PricingRuleKey {
  return (PRICING_RULE_KEYS as readonly string[]).includes(key)
}

export interface FloorCeilingRatio {
  /** Sàn = giá vốn × hệ số này. 0 nghĩa là không đặt Sàn. */
  floorRatio: number
  /** Trần = giá vốn × hệ số này. 0 nghĩa là không đặt Trần. */
  ceilingRatio: number
}

/**
 * Giá trị mặc định khi tổ chức chưa cấu hình — khớp `cauHinhMacDinh.ts`
 * phần liên quan tới giá (bản gốc dùng để "gieo lần đầu", core dùng để lấp
 * chỗ trống khi `pricing_rules` chưa có dòng nào cho khoá đó).
 */
export const DEFAULT_PARTNER_TIER_BONUS: PartnerTierBonus = {
  Growth: 0,
  Certified: 0.05,
  Premium: 0.1,
}

export const DEFAULT_SURCHARGE_GROUPS: SurchargeGroup[] = [
  {
    id: "ho_tro_ship",
    name: "Hỗ trợ ship",
    options: [
      { label: "Không hỗ trợ", value: 0 },
      { label: "25.000 đ", value: 25000 },
      { label: "35.000 đ", value: 35000 },
      { label: "50.000 đ", value: 50000 },
    ],
  },
  {
    id: "phu_phi_lam_gap",
    name: "Phụ phí làm gấp",
    options: [
      { label: "Không phụ phí", value: 0 },
      { label: "Trong 2h (30.000 đ)", value: 30000 },
      { label: "Trong 1h (50.000 đ)", value: 50000 },
    ],
  },
]

export const DEFAULT_OPTIMAL_PRICE_RATIO = 0.5

export const DEFAULT_FLOOR_CEILING_RATIO: FloorCeilingRatio = { floorRatio: 0, ceilingRatio: 0 }

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  partnerTierBonus: DEFAULT_PARTNER_TIER_BONUS,
  surchargeGroups: DEFAULT_SURCHARGE_GROUPS,
  optimalPriceRatio: DEFAULT_OPTIMAL_PRICE_RATIO,
}

/** Một dòng `pricing_rules` như repository trả về — xem `infra/pricing-rule-repository.ts`. */
export interface PricingRuleRow {
  key: string
  value: unknown
  branch_id: string | null
}

/**
 * Hợp nhất `pricing_rules` của một tổ chức thành cấu hình hiệu lực cho
 * `quotePrice`. Ba lớp theo thứ tự ưu tiên tăng dần: giá trị mặc định cứng ở
 * trên → dòng phạm vi tổ chức (`branch_id = null`) → dòng phạm vi đúng chi
 * nhánh đang hỏi (nếu có) — chi nhánh ghi đè tổ chức, tổ chức ghi đè mặc định.
 *
 * Không validate hình dạng `value` ở đây — đó là việc của `validatePricingRuleValue`
 * tại thời điểm ghi (`PUT /pricing-rules`). Một dòng đã lọt vào cơ sở dữ liệu
 * thì được coi là đúng hình dạng.
 */
export function mergeEffectivePricingConfig(
  rows: PricingRuleRow[],
  branchId: string | null
): PricingConfig {
  const orgWide = new Map<string, unknown>()
  const branchScoped = new Map<string, unknown>()

  for (const row of rows) {
    if (row.branch_id === null) orgWide.set(row.key, row.value)
    else if (branchId !== null && row.branch_id === branchId) branchScoped.set(row.key, row.value)
  }

  const pick = (key: PricingRuleKey): unknown => branchScoped.get(key) ?? orgWide.get(key)

  const partnerTierBonus = (pick("partner_tier_bonus") as PartnerTierBonus | undefined) ??
    DEFAULT_PARTNER_TIER_BONUS
  const surchargeGroups = (pick("surcharge_groups") as SurchargeGroup[] | undefined) ??
    DEFAULT_SURCHARGE_GROUPS
  const optimalPriceRatio = (pick("optimal_price_ratio") as number | undefined) ??
    DEFAULT_OPTIMAL_PRICE_RATIO

  return { partnerTierBonus, surchargeGroups, optimalPriceRatio }
}

/** `floor_ceiling_ratio` không thuộc `PricingConfig` (đầu vào của `quotePrice`) —
 *  nó nuôi `price-guard.ts`, tách riêng để hợp nhất. */
export function mergeEffectiveFloorCeilingRatio(
  rows: PricingRuleRow[],
  branchId: string | null
): FloorCeilingRatio {
  const branchRow = branchId !== null
    ? rows.find((r) => r.key === "floor_ceiling_ratio" && r.branch_id === branchId)
    : undefined
  const orgRow = rows.find((r) => r.key === "floor_ceiling_ratio" && r.branch_id === null)
  const value = (branchRow ?? orgRow)?.value as FloorCeilingRatio | undefined
  return value ?? DEFAULT_FLOOR_CEILING_RATIO
}

/**
 * Kiểm hình dạng một giá trị trước khi ghi (`PUT /pricing-rules`). Trả về
 * câu lỗi, rỗng nghĩa là hợp lệ. Không sửa giá trị — chuẩn hoá số/phần trăm
 * (`normalizePercent`) là việc của route trước khi gọi hàm này.
 */
export function validatePricingRuleValue(key: PricingRuleKey, value: unknown): string {
  switch (key) {
    case "partner_tier_bonus": {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return "partner_tier_bonus phải là một object { hạng: tỷ lệ }"
      }
      for (const [tier, ratio] of Object.entries(value as Record<string, unknown>)) {
        if (typeof ratio !== "number" || !Number.isFinite(ratio) || ratio < 0) {
          return `partner_tier_bonus.${tier} phải là số không âm`
        }
      }
      return ""
    }
    case "surcharge_groups": {
      if (!Array.isArray(value)) return "surcharge_groups phải là một mảng"
      for (const group of value) {
        if (
          typeof group !== "object" ||
          group === null ||
          typeof (group as SurchargeGroup).id !== "string" ||
          typeof (group as SurchargeGroup).name !== "string" ||
          !Array.isArray((group as SurchargeGroup).options)
        ) {
          return "mỗi nhóm phụ phí cần id, name, options"
        }
        for (const option of (group as SurchargeGroup).options) {
          if (typeof option.label !== "string" || typeof option.value !== "number" || option.value < 0) {
            return `mỗi lựa chọn phụ phí cần label và value (số không âm)`
          }
        }
      }
      return ""
    }
    case "optimal_price_ratio": {
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
        return "optimal_price_ratio phải là số trong khoảng [0, 1]"
      }
      return ""
    }
    case "floor_ceiling_ratio": {
      if (typeof value !== "object" || value === null) return "floor_ceiling_ratio phải là một object"
      const { floorRatio, ceilingRatio } = value as Partial<FloorCeilingRatio>
      if (typeof floorRatio !== "number" || floorRatio < 0) return "floorRatio phải là số không âm"
      if (typeof ceilingRatio !== "number" || ceilingRatio < 0) return "ceilingRatio phải là số không âm"
      if (floorRatio > 0 && ceilingRatio > 0 && ceilingRatio < floorRatio) {
        return "ceilingRatio phải lớn hơn hoặc bằng floorRatio khi cả hai cùng khai"
      }
      return ""
    }
    case "labor_rate_per_hour":
    case "default_packaging_vnd":
      return typeof value === "number" && Number.isFinite(value) && value >= 0 ? "" : `${key} phải là số không âm (VNĐ)`
    case "overhead_percent":
      return typeof value === "number" && value >= 0 && value <= 100 ? "" : "overhead_percent phải trong khoảng [0, 100]"
    case "price_change_alert_percent":
      return typeof value === "number" && value >= 1 && value <= 100 ? "" : "price_change_alert_percent phải trong khoảng [1, 100]"
    case "customer_tier_discount": {
      if (typeof value !== "object" || value === null || Array.isArray(value)) return "customer_tier_discount phải là object { hạng: tỷ lệ }"
      for (const [tier, ratio] of Object.entries(value as Record<string, unknown>)) {
        if (!isCustomerTier(tier)) return `Hạng khách không hợp lệ: ${tier}`
        if (typeof ratio !== "number" || ratio < 0 || ratio > MAX_TIER_DISCOUNT_RATIO) return `customer_tier_discount.${tier} phải trong khoảng [0, ${MAX_TIER_DISCOUNT_RATIO}]`
      }
      return ""
    }
    case "peak_hour_surcharge":
      if (!Array.isArray(value)) return "peak_hour_surcharge phải là một mảng khung giờ"
      return parsePeakHours(value).length === value.length ? "" : "Mỗi khung giờ cần startHour < endHour (0–24) và vnd dương"
    default:
      return `Khoá không nhận diện được`
  }
}
