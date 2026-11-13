import type { GreetingCatalogProduct } from "./greeting-card-types"
import type { PublicAppliedPolicies } from "./store-policy"

/**
 * Công tắc hiển thị giá và thông tin giảm giá trên Thẻ chào (checklist ALG 5.5), lưu ở
 * `organizations.settings.greetingCardPricing`. Hàm thuần — không Prisma.
 *
 * - Tắt giá: khách thấy "Liên hệ báo giá"; máy chủ bỏ mọi con số giá khỏi phản hồi công khai,
 *   đơn vẫn đặt được và đi luồng "chờ báo giá" (cửa hàng báo giá trước khi thu tiền).
 *   Mẫu chỉ liên hệ (`CONTACT`) giữ nguyên chính sách không đặt online.
 * - Tắt thông tin giảm giá: ẩn danh sách ưu đãi và băng rôn ưu đãi trên trang khách; báo giá và đơn
 *   không áp ưu đãi, không bắt khách chọn (khách không thấy thì không áp). Mã giảm giá khách tự nhập
 *   vẫn theo công tắc ô nhập mã của tiệm.
 */
export const PRICE_VISIBILITY_KEY = "greetingCardPricing"

export interface PriceVisibility {
  hidePrice: boolean
  showDiscounts: boolean
}

export const DEFAULT_PRICE_VISIBILITY: PriceVisibility = { hidePrice: false, showDiscounts: true }

export function readPriceVisibility(orgSettings: unknown): PriceVisibility {
  const settings = orgSettings && typeof orgSettings === "object" ? (orgSettings as Record<string, unknown>) : {}
  const raw = settings[PRICE_VISIBILITY_KEY]
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...DEFAULT_PRICE_VISIBILITY }
  const r = raw as Record<string, unknown>
  return {
    hidePrice: r.hidePrice === true,
    showDiscounts: r.showDiscounts !== false,
  }
}

/** Mẫu gửi cho khách khi tiệm tắt giá: không còn giá, khoảng giá, giá cao điểm hay giá phiên bản. */
export function applyPriceVisibility(product: GreetingCatalogProduct, visibility: PriceVisibility): GreetingCatalogProduct {
  if (!visibility.hidePrice) return product
  return {
    ...product,
    price: null,
    priceMode: product.priceMode === "CONTACT" ? "CONTACT" : "FIXED",
    priceMaxVnd: null,
    peakPriceVnd: null,
    weekendIsPeak: false,
    priceDimensions: [],
    variants: [],
    priceHidden: true,
  }
}

/** Ưu đãi công khai khi tiệm tắt thông tin giảm giá: không danh sách, không băng rôn. */
export function applyDiscountVisibility(applied: PublicAppliedPolicies, visibility: PriceVisibility): PublicAppliedPolicies {
  if (visibility.showDiscounts) return applied
  return {
    ...applied,
    promotions: [],
    allowCustomerPromotionChoice: false,
    intakePromotionCta: { enabled: false, percent: applied.intakePromotionCta?.percent ?? 0 },
  }
}
