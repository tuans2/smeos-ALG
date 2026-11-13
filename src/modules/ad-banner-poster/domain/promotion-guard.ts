import type { BannerCopyPayload } from "./banner-types"

/** Dấu hiệu một câu đang hứa ưu đãi (giảm giá, quà, freeship…). */
const OFFER_PATTERN = /%|giảm|tặng|freeship|miễn phí|mua \d+|voucher|mã ưu đãi|sale|deal|giá sốc|ưu đãi/i

/** Nhãn ưu đãi in lên ấn phẩm: đầu tiên trong danh sách tiệm đang bật; không có → "". */
export function shopPromotionBadge(shopPromotions: readonly string[], preferred?: string | undefined): string {
  const wanted = preferred?.trim().toLowerCase()
  const match = wanted ? shopPromotions.find((t) => t.trim().toLowerCase() === wanted) : undefined
  return (match ?? shopPromotions[0] ?? "").toUpperCase()
}

/**
 * Chỉ giữ ưu đãi tiệm đã bật trong Hồ sơ tiệm (PO 29/10/2026): nhãn ưu đãi bị thay bằng ưu đãi của tiệm,
 * thời hạn không tự đặt. Tiệm chưa bật ưu đãi mà tiêu đề/thông điệp/nút vẫn hứa ưu đãi → null (dùng mẫu).
 */
export function enforceShopPromotion(copy: BannerCopyPayload, shopPromotions: readonly string[]): BannerCopyPayload | null {
  if (shopPromotions.length === 0 && [copy.headline, copy.subHeadline, copy.ctaText].some((t) => OFFER_PATTERN.test(t))) return null
  const own = shopPromotions.find((t) => t.trim().toLowerCase() === copy.promotionBadge.trim().toLowerCase())
  return { ...copy, promotionBadge: (own ?? shopPromotions[0] ?? "").toUpperCase(), validityText: "" }
}
