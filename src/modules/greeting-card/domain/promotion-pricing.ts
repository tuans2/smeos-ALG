/**
 * Ưu đãi có tính tiền (PO 08/10/2026): mỗi đơn tối đa 01 ưu đãi; "Giảm %" trừ thật trên TỔNG đơn,
 * "Miễn phí ship" đưa phí giao về 0, "Tặng kèm" không đổi số tiền (xưởng làm theo ghi chú).
 * Máy chủ luôn tự tính lại — khách không gửi được số tiền giảm. Pure TypeScript.
 */

export const PROMOTION_KINDS = ["GIFT", "PERCENT_OFF", "FREE_SHIPPING"] as const
export type PromotionKind = (typeof PROMOTION_KINDS)[number]

export const PROMOTION_KIND_LABEL: Record<PromotionKind, string> = {
  GIFT: "Tặng kèm (không đổi tiền)",
  PERCENT_OFF: "Giảm % trên tổng đơn",
  FREE_SHIPPING: "Miễn phí giao hoa",
}

/** Phần tính tiền của một ưu đãi — lưu kèm đơn để báo giá sau vẫn trừ đúng mức khách đã chọn. */
export interface PromotionPricing {
  kind: PromotionKind
  /** 1–100, chỉ có với `PERCENT_OFF`. */
  percent: number | null
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function validPercent(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 100 ? Math.round(value) : null
}

/**
 * Đọc phần tính tiền từ một mục ưu đãi đã lưu. Mục cũ không có `kind`: có `config.percent` hợp lệ →
 * Giảm %, còn lại là Tặng kèm — không bao giờ tự suy ra "miễn phí ship" từ tên ưu đãi.
 */
export function promotionPricingOf(item: { kind?: unknown; config?: unknown }): PromotionPricing {
  const percent = validPercent(asRecord(item.config).percent)
  const kind = (PROMOTION_KINDS as readonly unknown[]).includes(item.kind) ? (item.kind as PromotionKind) : percent !== null ? "PERCENT_OFF" : "GIFT"
  if (kind === "PERCENT_OFF") return percent !== null ? { kind, percent } : { kind: "GIFT", percent: null }
  return { kind, percent: null }
}

/** Số tiền giảm (đồng, làm tròn) của ưu đãi trên tổng đơn trước ưu đãi; không bao giờ âm hay vượt tổng. */
export function promotionDiscountVnd(promotion: PromotionPricing | null | undefined, orderTotalVnd: number): number {
  if (!promotion || promotion.kind !== "PERCENT_OFF" || promotion.percent === null || orderTotalVnd <= 0) return 0
  return Math.min(orderTotalVnd, Math.round((orderTotalVnd * promotion.percent) / 100))
}

export function promotionWaivesShipping(promotion: PromotionPricing | null | undefined): boolean {
  return promotion?.kind === "FREE_SHIPPING"
}

/**
 * Ưu đãi khách đã chọn, đọc lại từ bản chụp lưu kèm đơn (`pricing_rule_ref.policies.promotion`).
 * Đơn cũ không có `kind` → Tặng kèm (không tự trừ tiền khi chưa chắc khách được hứa gì).
 */
export function promotionFromOrderRef(pricingRuleRef: unknown): PromotionPricing | null {
  const promo = asRecord(asRecord(asRecord(pricingRuleRef).policies).promotion)
  if (!promo.id) return null
  return promotionPricingOf({ kind: promo.kind, config: { percent: promo.percent } })
}

/** Báo giá mẫu chưa niêm yết: Điều hành nhập giá trọn gói, máy trừ ưu đãi "Giảm %" khách đã chọn. */
export function quotedTotalAfterPromotion(pricingRuleRef: unknown, enteredVnd: number): { totalVnd: number; promotionDiscountVnd: number } {
  const discount = promotionDiscountVnd(promotionFromOrderRef(pricingRuleRef), enteredVnd)
  return { totalVnd: enteredVnd - discount, promotionDiscountVnd: discount }
}
