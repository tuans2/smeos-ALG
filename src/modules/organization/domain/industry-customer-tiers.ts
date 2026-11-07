/**
 * Ngưỡng hạng khách theo ngành (PO 07/11/2026, kế hoạch logic nghiệp vụ Q6). Khách đạt hạng khi chi tiêu THỰC THU
 * đạt `spentVnd` HOẶC số đơn đạt `orders`. Ngành chưa khai thì dùng ngưỡng mặc định (= ngưỡng ngành hoa hiện tại).
 */

export interface TierThreshold {
  readonly spentVnd: number
  readonly orders: number
}

export interface CustomerTierThresholds {
  readonly VIP: TierThreshold
  readonly GOLD: TierThreshold
  readonly SILVER: TierThreshold
  readonly BRONZE: TierThreshold
}

export const DEFAULT_CUSTOMER_TIER_THRESHOLDS: CustomerTierThresholds = Object.freeze({
  VIP: { spentVnd: 10_000_000, orders: 10 },
  GOLD: { spentVnd: 5_000_000, orders: 5 },
  SILVER: { spentVnd: 2_000_000, orders: 3 },
  BRONZE: { spentVnd: 500_000, orders: 1 },
})

export function customerTierThresholdsOf(plugin: { readonly customerTiers?: CustomerTierThresholds | undefined }): CustomerTierThresholds {
  return plugin.customerTiers ?? DEFAULT_CUSTOMER_TIER_THRESHOLDS
}
