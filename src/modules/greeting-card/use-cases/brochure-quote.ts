import { normalizePhone } from "../domain/greeting-card-rules"
import {
  awaitingQuote,
  computeQuote,
  parseShippingConfig,
  voucherBlocker,
  type BrochureQuote,
  type PricedVariant,
  type VoucherFacts,
} from "../domain/brochure-pricing"
import type { GreetingCatalogProduct } from "../domain/greeting-card-types"
import type { PromotionPricing } from "../domain/promotion-pricing"
import { resolveAppliedPolicies } from "../domain/store-policy"
import type { PolicyGovernanceUpper } from "@/modules/organization/domain/governance-decisions"
import { selectPromotion } from "../domain/order-policies"
import { applyDiscountVisibility, readPriceVisibility } from "../domain/price-visibility"
import { BrochureCheckoutRepository, getBrochureCheckoutRepository } from "../infra/brochure-checkout-repository"
import { holidayOn, holidaySurcharge, parseHolidayPolicy } from "../domain/holiday-policy"
import { paymentSplit } from "../domain/payment-schedule"
import { findPaymentCode, parsePaymentPlans, type PaymentCodeRule } from "../domain/payment-plan"
import { resolvePaymentPlan } from "./payment-plan-quote"
import { listActiveShopPromotions } from "./active-shop-promotions"
import { isWeekend, unitPriceFor } from "@/modules/products/domain/product-pricing"
import { craftFeeForProduct } from "./craft-fee-for-product"
import { tierAndPeakFor } from "./tier-and-peak-pricing"
import { floorTotalVnd } from "@/modules/costing/use-cases/price-floor-guard"
import type { TenantContext } from "@/core/tenancy"

/** Trang khách không có phiên: ngữ cảnh chỉ đọc của tổ chức sở hữu catalog, để tra giá sàn. */
function quoteContext(organizationId: string): TenantContext {
  return { organizationId, workspaceId: "", userId: "system:brochure-quote", branchId: null, capabilities: new Set() }
}

export interface QuoteRequest {
  variantId?: string | undefined
  quantity?: number | undefined
  shippingZoneId?: string | undefined
  voucherCode?: string | undefined
  /** Mã thanh toán (DC30…) — đổi cách thu (cọc/trả đủ), KHÔNG giảm giá. Máy chủ kiểm. */
  paymentCode?: string | undefined
  customerPhone?: string | undefined
  /** Ưu đãi khách chọn — máy chủ tra lại trong ưu đãi bộ sưu tập đang áp dụng. */
  selectedPromotionId?: string | undefined
  /** Ngày giao khách đang chọn — để báo các khung giờ đã kín (`fullSlots`) và tính phụ phí ngày lễ. */
  deliveryDate?: string | undefined
  /** Khung giờ giao — tính phụ phí giờ cao điểm (checklist ALG 3.1) */
  deliveryTimeSlot?: string | undefined
}

export interface QuoteResult {
  quote: BrochureQuote
  variant: PricedVariant | null
  voucher: VoucherFacts | null
  /** Lỗi theo trường (tiếng Việt). Báo giá vẫn trả số tạm tính khi có lỗi. */
  errors: Record<string, string>
  /** Nhãn khung giờ đã đủ đơn của `deliveryDate` (chỉ báo giá trên trang khách trả). */
  fullSlots?: string[]
  /** Mã thanh toán hợp lệ đã áp (chỉ dùng ở máy chủ khi tạo đơn). */
  paymentCodeRule?: PaymentCodeRule | null
}

/**
 * Ưu đãi (phần tính tiền) cho một báo giá: tra lựa chọn của khách trong ưu đãi bộ sưu tập đang áp
 * dụng. Lựa chọn không còn hợp lệ → báo lỗi trường, tính như không có ưu đãi.
 */
export function promotionForQuote(
  catalogFilters: unknown,
  shopSettings: unknown,
  selectedPromotionId: string | undefined,
  governanceUpper?: PolicyGovernanceUpper
): { promotion: PromotionPricing | null; error: string | null } {
  const applied = applyDiscountVisibility(resolveAppliedPolicies(catalogFilters, shopSettings, undefined, governanceUpper), readPriceVisibility(shopSettings))
  const chosen = selectPromotion(applied, selectedPromotionId)
  if (!chosen.ok) return { promotion: null, error: chosen.message }
  return { promotion: chosen.promotion ? { kind: chosen.promotion.kind, percent: chosen.promotion.percent } : null, error: null }
}

/**
 * Báo giá một mẫu theo lựa chọn của khách. Mọi con số (giá biến thể, phí
 * giao, giảm giá, ưu đãi) lấy từ dữ liệu của tiệm ở server; client chỉ gửi lựa chọn.
 */
export async function quoteForProduct(
  organizationId: string,
  product: GreetingCatalogProduct,
  req: QuoteRequest,
  shopSettings: unknown,
  checkout = getBrochureCheckoutRepository(),
  promotion: PromotionPricing | null = null,
  /** `catalog.filters` của bộ sưu tập khách đang đặt — quyết định có phụ phí ngày lễ không */
  catalogFilters?: unknown,
  /** Bộ sưu tập khách đang đặt — mã thanh toán có thể chỉ áp cho một số bộ sưu tập. */
  catalogId: string | null = null,
): Promise<QuoteResult> {
  const priced = await priceProduct(organizationId, product, req, shopSettings, checkout, promotion, catalogFilters)
  const resolved = await resolvePaymentPlan(
    organizationId,
    shopSettings,
    {
      paymentCode: req.paymentCode,
      totalVnd: priced.quote.awaitingQuote ? null : priced.quote.totalVnd,
      catalogId,
      deliveryDate: req.deliveryDate,
    },
    checkout,
  )
  const split = paymentSplit(priced.quote.totalVnd, resolved.plan.depositPercent)
  return {
    ...priced,
    quote: { ...priced.quote, paymentPlan: { ...resolved.plan, dueNowVnd: split.dueNowVnd, dueLaterVnd: split.dueLaterVnd } },
    errors: resolved.error ? { ...priced.errors, paymentCode: resolved.error } : priced.errors,
    paymentCodeRule: resolved.rule,
  }
}

async function priceProduct(
  organizationId: string,
  product: GreetingCatalogProduct,
  req: QuoteRequest,
  shopSettings: unknown,
  checkout: BrochureCheckoutRepository,
  promotion: PromotionPricing | null,
  catalogFilters: unknown,
): Promise<QuoteResult> {
  const errors: Record<string, string> = {}

  const variants = product.variants ?? []
  let variant: PricedVariant | null = null
  if (req.variantId) {
    variant = variants.find((v) => v.id === req.variantId) ?? null
    if (!variant) errors.variantId = "Size/biến thể đã chọn không còn bán"
  }

  const shipping = parseShippingConfig(shopSettings)
  let zone = null
  if (shipping.zones.length > 0) {
    zone = shipping.zones.find((z) => z.id === req.shippingZoneId) ?? null
    if (!zone) errors.shippingZoneId = "Vui lòng chọn khu vực giao hàng"
  }

  if (product.priceMode === "CONTACT") {
    errors.product = "Mẫu này cửa hàng tư vấn giá trực tiếp — vui lòng gọi, nhắn Zalo hoặc gửi tin nhắn cho cửa hàng"
  }
  if (product.priceMode === "RANGE" && !variant && !errors.variantId) {
    errors.variantId = "Vui lòng chọn phiên bản"
  }
  const deliveryDate = req.deliveryDate?.trim() ?? ""
  const holiday = deliveryDate ? holidayOn(deliveryDate, parseHolidayPolicy(shopSettings)) : null
  // Ngày cao điểm: ngày lễ cửa hàng khai, hoặc cuối tuần khi sản phẩm bật
  const isPeakDay = holiday !== null || (product.weekendIsPeak === true && isWeekend(deliveryDate))
  const basePrice = variant?.priceVnd ?? product.price
  const peakPrice = variant ? variant.peakPriceVnd ?? null : product.peakPriceVnd ?? null
  const peakApplied = isPeakDay && peakPrice !== null
  // Ngày lễ: phần phí chế tác theo kiểu dáng nhân hệ số, gộp vào đơn giá (PO Q8) — trừ khi đã có giá cao điểm riêng
  const craft = craftFeeForProduct(product.craftStyle, shopSettings, holiday !== null && !peakApplied)
  const unitPriceVnd = basePrice === null ? null : unitPriceFor(basePrice, peakPrice, isPeakDay) + (craft?.holidayExtraVnd ?? 0)
  const quantity = req.quantity ?? 1
  // Tiệm tắt mã giảm giá (mặc định): ô nhập bị ẩn, mã gửi thẳng API cũng bị bỏ qua
  const code = shipping.vouchersEnabled ? req.voucherCode?.trim() : undefined
  if (unitPriceVnd === null) {
    // Mẫu chưa niêm yết giá: nhận đơn, cửa hàng báo giá trọn gói sau (ưu đãi trừ lúc báo giá)
    if (code) errors.voucherCode = "Mẫu này chưa niêm yết giá nên chưa áp dụng được mã giảm giá"
    return { quote: awaitingQuote(quantity, zone), variant, voucher: null, errors }
  }
  let voucher: VoucherFacts | null = null
  if (code) {
    const found = await checkout.findVoucher(organizationId, code)
    if (!found) {
      // Mã đặt cọc (DC30…) không phải mã giảm giá — chỉ khách sang đúng ô
      errors.voucherCode = findPaymentCode(parsePaymentPlans(shopSettings), code)
        ? "Đây là mã áp dụng đặt cọc — vui lòng nhập ở ô Mã áp dụng đặt cọc"
        : "Mã giảm giá không tồn tại"
    } else {
      const customerId = await checkout.findCustomerIdByPhone(organizationId, normalizePhone(req.customerPhone))
      const blocker = voucherBlocker(found, unitPriceVnd * quantity, customerId, new Date(), {
        // Mã thuộc một ưu đãi: đi theo công tắc của ưu đãi đó ở ma trận ưu đãi
        activePromotionIds: found.promotionId
          ? new Set((await listActiveShopPromotions(organizationId)).map((p) => p.id))
          : undefined,
        customerUses: found.perCustomerLimit != null && customerId
          ? await checkout.countVoucherUses(organizationId, found.id, customerId)
          : undefined,
      })
      if (blocker) errors.voucherCode = blocker
      else voucher = found
    }
  }

  // Đã tính giá cao điểm riêng của sản phẩm thì không cộng thêm phụ phí ngày lễ (tránh thu hai lần)
  const surcharge = peakApplied ? null : holidaySurcharge(holiday, catalogFilters)
  // Chiết khấu hạng khách (khách nhận diện qua SĐT) và phụ phí giờ cao điểm (checklist ALG 3.1)
  const { tierDiscount, peakHour } = await tierAndPeakFor(organizationId, req.customerPhone, req.deliveryTimeSlot)
  // Sau mọi khoản giảm tiền hàng không dưới giá sàn (PO 07/11/2026, audit BL-08) — cùng cách tính sàn với báo giá
  const floorVnd = await floorTotalVnd(quoteContext(organizationId), [{ productId: product.id, quantity }])
  const quote = computeQuote({ unitPriceVnd, quantity, zone, shipping, voucher, promotion, surcharge, tierDiscount, peakHour, floorVnd })
  return { quote: craft ? { ...quote, craftFee: craft } : quote, variant, voucher, errors }
}
