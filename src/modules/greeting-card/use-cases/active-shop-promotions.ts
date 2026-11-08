import { loadPolicyGovernance } from "@/modules/organization/use-cases/governance-matrix"
import { isGovernedItemEnabled, PLATFORM_MAX_DISCOUNT_PERCENT } from "@/modules/organization/domain/governance-decisions"
import { resolveAppliedPolicies, type PublicAppliedPolicies } from "../domain/store-policy"
import { getShopContactRepository } from "../infra/shop-contact-repository"

export type ActiveShopPromotion = PublicAppliedPolicies["promotions"][number]

/**
 * Ưu đãi đang bật trong Hồ sơ tiệm (đã áp khoá tầng trên). Công cụ tạo ấn phẩm (landing page, poster)
 * chỉ được in ưu đãi từ danh sách này — không tự đặt ưu đãi (PO 29/10/2026).
 */
export async function listActiveShopPromotions(
  organizationId: string,
  repo = getShopContactRepository(),
): Promise<ActiveShopPromotion[]> {
  const raw = await repo.findByOrganizationId(organizationId)
  if (!raw) return []
  return resolveAppliedPolicies(undefined, raw.settings, raw.industry, await loadPolicyGovernance(organizationId)).promotions
}

/** % giảm của ưu đãi "Giảm %" đầu tiên đang bật; không có → undefined (không in ưu đãi giảm giá). */
export function shopDiscountPercent(promotions: readonly ActiveShopPromotion[]): number | undefined {
  return promotions.find((p) => p.kind === "PERCENT_OFF" && p.percent !== null)?.percent ?? undefined
}

export interface ShopPromotionPolicy {
  promotions: ActiveShopPromotion[]
  /** Trần % giảm đang áp (khoá nền tảng ở ma trận ưu đãi); null = tầng trên đã mở trần */
  maxDiscountPercent: number | null
}

/**
 * Ưu đãi đang bật + trần giảm giá — cho công cụ Phát hành mã giảm giá: mã gắn ưu đãi nào thì
 * đi theo công tắc của ưu đãi đó ở ma trận ưu đãi (một nguồn, hai nơi hiển thị).
 */
export async function shopPromotionPolicy(
  organizationId: string,
  repo = getShopContactRepository(),
): Promise<ShopPromotionPolicy> {
  const raw = await repo.findByOrganizationId(organizationId)
  const upper = await loadPolicyGovernance(organizationId)
  if (!raw) return { promotions: [], maxDiscountPercent: PLATFORM_MAX_DISCOUNT_PERCENT }
  const capOn = isGovernedItemEnabled("MAX_DISCOUNT_PERCENT", upper.own?.PROMOTIONS, "PROMOTIONS", upper.PROMOTIONS)
  return {
    promotions: resolveAppliedPolicies(undefined, raw.settings, raw.industry, upper).promotions,
    maxDiscountPercent: capOn ? PLATFORM_MAX_DISCOUNT_PERCENT : null,
  }
}
