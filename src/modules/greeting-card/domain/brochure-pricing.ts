/**
 * Tính tiền đơn Thẻ chào: biến thể (size), số lượng, phí giao theo khu vực,
 * mã giảm giá. Pure TypeScript — dùng chung cho báo giá (quote) và tạo đơn
 * nên con số khách thấy luôn trùng con số ghi vào đơn.
 */

import { resolveProductPriceVnd } from "./brochure-commerce-rules"
import { DELIVERY_SLOT_IDS } from "./delivery-schedule"
import { promotionDiscountVnd, promotionWaivesShipping, type PromotionPricing } from "./promotion-pricing"
import { parseSlotCapacity, type SlotCapacityConfig } from "./slot-capacity"
import { tierDiscountVnd } from "@/modules/products/domain/customer-tier-pricing"
import { parsePaymentPlans, paymentCodesEnabled, type PaymentPlanSnapshot } from "./payment-plan"
import { PLATFORM_MAX_DISCOUNT_PERCENT } from "@/modules/organization/domain/governance-decisions"

export const MAX_ORDER_QUANTITY = 20

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function positiveInt(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : null
}

// ── Biến thể ─────────────────────────────────────────────────────────────────

export interface PricedVariant {
  id: string
  name: string
  priceVnd: number
  /** Giá ngày cao điểm (kiểu giá theo phiên bản); `null` = như giá thường */
  peakPriceVnd?: number | null | undefined
  /** Số cành của phiên bản — ghi vào đơn để phiếu thợ in đúng (checklist ALG 2.4) */
  stemCount?: number | null | undefined
}

/**
 * Giá từng biến thể: `variant.attributes.price` nếu có, ngược lại giá gốc ×
 * `multiplier`. Biến thể không suy ra được giá thì bị bỏ (không bán online).
 */
export function resolvePricedVariants(
  productAttributes: unknown,
  variants: Array<{ id: string; name: string; size?: string | null; multiplier: number; attributes: unknown }>
): PricedVariant[] {
  const base = resolveProductPriceVnd(productAttributes)
  const out: PricedVariant[] = []
  for (const v of variants) {
    const own = positiveInt(asRecord(v.attributes).price)
    const derived = base !== null && v.multiplier > 0 ? Math.round(base * v.multiplier) : null
    const priceVnd = own ?? derived
    if (priceVnd === null) continue
    const label = v.size && !v.name.includes(v.size) ? `${v.name} (${v.size})` : v.name
    out.push({ id: v.id, name: label, priceVnd })
  }
  return out
}

// ── Phí giao theo khu vực ────────────────────────────────────────────────────

export const BROCHURE_SHIPPING_SETTINGS_KEY = "brochure_shipping"

export interface ShippingZone {
  id: string
  name: string
  feeVnd: number
}

export const DEFAULT_PREP_HOURS = 2

export interface ShippingConfig {
  zones: ShippingZone[]
  /** Miễn phí giao khi tạm tính (sau giảm giá) từ mức này; null = không miễn. */
  freeShippingOverVnd: number | null
  /** Sau giờ này (0–23, giờ VN) không nhận giao trong ngày; null = không giới hạn. */
  sameDayCutoffHour?: number | null
  /** Thời gian xử lý & chuẩn bị đơn tối thiểu trước khi giao (lead time, giờ; mặc định DEFAULT_PREP_HOURS = 2h). */
  prepHours?: number
  /** Id khung giờ 2 tiếng đang bật (`delivery_slots`); thiếu = bật tất cả. */
  slotIds?: string[]
  /** Cho khách nhập giờ cụ thể (`allow_custom_time`); thiếu = cho phép. */
  allowCustomTime?: boolean
  /** Miễn phí giao cho MỌI đơn (`free_shipping_all`, PO 08/10/2026); thiếu = tính phí theo khu vực. */
  freeShippingAll?: boolean
  /** Cho khách nhập mã giảm giá (`voucher_enabled`); thiếu = ẩn ô nhập, máy chủ bỏ qua mã gửi lên. */
  vouchersEnabled?: boolean
  /** Trần đơn mỗi khung giờ (`slot_capacity`); thiếu = 100 đơn/khung (`slot-capacity.ts`). */
  slotCapacity?: SlotCapacityConfig
  /**
   * Hiện ô "mã thanh toán" (tiệm có mã đặt cọc đang bật). KHÔNG đọc từ `brochure_shipping` — use-case
   * trả trang khách gắn thêm từ `brochure_payment_plans` (`withPaymentCodeFlag`).
   */
  paymentCodesEnabled?: boolean
}

/** Cấu hình giao hoa gửi trang khách + cờ ô mã thanh toán (không lộ danh sách mã). */
export function withPaymentCodeFlag(settings: unknown): ShippingConfig {
  const shipping = parseShippingConfig(settings)
  return paymentCodesEnabled(parsePaymentPlans(settings)) ? { ...shipping, paymentCodesEnabled: true } : shipping
}

/** Đọc `organizations.settings.brochure_shipping`; sai/thiếu → không khu vực nào (phí 0, báo sau). */
export function parseShippingConfig(settings: unknown): ShippingConfig {
  const raw = asRecord(asRecord(settings)[BROCHURE_SHIPPING_SETTINGS_KEY])
  const zones: ShippingZone[] = []
  const seen = new Set<string>()
  for (const z of Array.isArray(raw.zones) ? raw.zones : []) {
    const r = asRecord(z)
    const id = typeof r.id === "string" ? r.id.trim().slice(0, 40) : ""
    const name = typeof r.name === "string" ? r.name.trim().slice(0, 80) : ""
    const fee = typeof r.fee_vnd === "number" && Number.isFinite(r.fee_vnd) && r.fee_vnd >= 0 ? Math.round(r.fee_vnd) : null
    if (!id || !name || fee === null || seen.has(id)) continue
    seen.add(id)
    zones.push({ id, name, feeVnd: fee })
  }
  const cutoff = raw.same_day_cutoff_hour
  const prep = raw.prep_hours
  return {
    zones: zones.slice(0, 30),
    freeShippingOverVnd: positiveInt(raw.free_shipping_over_vnd),
    // Chỉ thêm khoá khi tiệm đã cấu hình — cấu hình cũ giữ nguyên hình dạng
    ...(typeof cutoff === "number" && Number.isInteger(cutoff) && cutoff >= 1 && cutoff <= 23 ? { sameDayCutoffHour: cutoff } : {}),
    ...(typeof prep === "number" && Number.isFinite(prep) && prep >= 0 && prep <= 24 ? { prepHours: Math.round(prep * 10) / 10 } : {}),
    ...parseSlotSettings(raw.delivery_slots, raw.allow_custom_time),
    ...(raw.free_shipping_all === true ? { freeShippingAll: true } : {}),
    ...(raw.voucher_enabled === true ? { vouchersEnabled: true } : {}),
    ...(raw.slot_capacity ? { slotCapacity: parseSlotCapacity(raw.slot_capacity) } : {}),
  }
}

// ── Mã giảm giá ──────────────────────────────────────────────────────────────

export interface VoucherFacts {
  id: string
  code: string
  discountType: "PERCENTAGE" | "FIXED_AMOUNT"
  discountValue: number
  minOrderVnd: number
  maxDiscountVnd: number | null
  expiresAt: Date | null
  isUsed: boolean
  /** Mã gắn riêng một khách (null = công khai). */
  customerId: string | null
  /** Phát hành mã giảm giá (30/10/2026) — thiếu = mã cũ: không có ngày bắt đầu, luôn bật. */
  startsAt?: Date | null | undefined
  isActive?: boolean | undefined
  /** Ưu đãi trong danh mục mà mã thuộc về — ưu đãi tắt/bị khoá thì mã ngừng nhận. */
  promotionId?: string | null | undefined
  perCustomerLimit?: number | null | undefined
}

/** Bối cảnh kiểm thêm cho mã thuộc đợt phát hành; thiếu = bỏ qua (mã cũ). */
export interface VoucherContext {
  /** Ưu đãi đang bật (đã áp khoá tầng trên) */
  activePromotionIds?: ReadonlySet<string> | undefined
  /** Số lượt khách này đã dùng mã */
  customerUses?: number | undefined
}

/** Lý do mã không dùng được (tiếng Việt) hoặc `null`. */
export function voucherBlocker(
  v: VoucherFacts,
  subtotalVnd: number,
  customerId: string | null,
  now: Date = new Date(),
  context: VoucherContext = {}
): string | null {
  if (v.isActive === false) return "Mã giảm giá đang tạm dừng"
  if (v.isUsed) return "Mã giảm giá đã hết lượt sử dụng"
  if (v.startsAt && v.startsAt.getTime() > now.getTime()) return "Mã giảm giá chưa đến ngày áp dụng"
  if (v.expiresAt && v.expiresAt.getTime() <= now.getTime()) return "Mã giảm giá đã hết hạn"
  if (v.promotionId && context.activePromotionIds && !context.activePromotionIds.has(v.promotionId)) {
    return "Chương trình ưu đãi của mã này đã kết thúc"
  }
  if (v.perCustomerLimit != null && (context.customerUses ?? 0) >= v.perCustomerLimit) {
    return "Bạn đã dùng hết lượt của mã giảm giá này"
  }
  if (v.customerId && v.customerId !== customerId) return "Mã giảm giá này dành riêng cho một khách hàng khác"
  if (subtotalVnd < v.minOrderVnd) {
    return `Đơn tối thiểu ${v.minOrderVnd.toLocaleString("vi-VN")} đ để dùng mã này`
  }
  return null
}

export function voucherDiscountVnd(v: VoucherFacts, subtotalVnd: number): number {
  const raw = v.discountType === "PERCENTAGE" ? Math.round((subtotalVnd * v.discountValue) / 100) : Math.round(v.discountValue)
  const capped = v.maxDiscountVnd !== null ? Math.min(raw, v.maxDiscountVnd) : raw
  return Math.max(0, Math.min(capped, subtotalVnd))
}

// ── Báo giá ──────────────────────────────────────────────────────────────────

export interface QuoteInput {
  unitPriceVnd: number
  quantity: number
  zone: ShippingZone | null
  shipping: ShippingConfig
  voucher: VoucherFacts | null
  /** Ưu đãi khách chọn (tối đa 01) — máy chủ tự tính, không nhận số tiền từ client. */
  promotion?: PromotionPricing | null | undefined
  /** Phụ phí ngày lễ (bộ sưu tập bật áp dụng + ngày giao là ngày lễ có phụ phí) */
  surcharge?: { vnd: number; name: string } | null | undefined
  /** Chiết khấu theo hạng khách đã nhận diện (checklist ALG 3.1) — tỷ lệ trên tiền hàng */
  tierDiscount?: { ratio: number; label: string } | null | undefined
  /** Phụ phí giờ cao điểm theo khung giờ giao (checklist ALG 3.1) */
  peakHour?: { vnd: number; label: string } | null | undefined
  /** Giá sàn của tiền hàng (tổng sàn × số lượng); sau mọi khoản giảm tiền hàng không thấp hơn số này. */
  floorVnd?: number | undefined
}

export interface BrochureQuote {
  unitPriceVnd: number
  quantity: number
  subtotalVnd: number
  discountVnd: number
  shippingFeeVnd: number
  totalVnd: number
  shippingZone: { id: string; name: string } | null
  voucherCode: string | null
  /** Số tiền ưu đãi "Giảm %" đã trừ trên tổng đơn (chỉ có khi > 0). */
  promotionDiscountVnd?: number
  /** Mẫu chưa niêm yết giá: đơn được nhận với tổng 0, cửa hàng báo giá sau. */
  awaitingQuote?: boolean
  /** Phí chế tác theo kiểu dáng (PO Q8) — đã gộp trong đơn giá, chỉ để sổ nội bộ tách tiền hoa và phí. */
  craftFee?: import("./craft-style-fee").CraftFeeBreakdown
  /** Chiết khấu hạng khách và phụ phí giờ cao điểm — mỗi khoản một dòng (checklist ALG 3.1). */
  tierDiscountVnd?: number
  tierLabel?: string
  peakHourSurchargeVnd?: number
  peakHourLabel?: string
  /** Tổng giảm (mã + hạng + ưu đãi) đã bị chặn bởi trần tổng hoặc giá sàn (PO 07/11/2026). */
  discountCapped?: true
  /** Phụ phí ngày lễ đã cộng vào tổng (không bị mã giảm giá trừ). */
  holidaySurchargeVnd?: number
  holidayName?: string
  /**
   * Kế hoạch thanh toán (Payment Policy + mã thanh toán nếu có) và số phải trả hôm nay / trả sau.
   * KHÔNG ảnh hưởng `totalVnd`. Lưu nguyên vào `pricing_rule_ref.paymentPlan` khi tạo đơn.
   */
  paymentPlan?: PaymentPlanSnapshot & { dueNowVnd: number; dueLaterVnd: number }
}

export function computeQuote(input: QuoteInput): BrochureQuote {
  const quantity = Math.min(Math.max(Math.round(input.quantity), 1), MAX_ORDER_QUANTITY)
  const subtotalVnd = input.unitPriceVnd * quantity
  // Trần TỔNG giảm (PO 07/11/2026, audit BL-08): mã + hạng + ưu đãi cộng lại không quá 50% tiền hàng và tiền hàng
  // sau giảm không dưới giá sàn. Vượt thì cắt theo thứ tự ưu đãi → hạng → mã.
  const maxDiscountVnd = Math.max(0, Math.min(Math.floor((subtotalVnd * PLATFORM_MAX_DISCOUNT_PERCENT) / 100), subtotalVnd - (input.floorVnd ?? 0)))
  const rawVoucherVnd = input.voucher ? voucherDiscountVnd(input.voucher, subtotalVnd) : 0
  const discountVnd = Math.min(rawVoucherVnd, maxDiscountVnd)
  const rawTierVnd = input.tierDiscount ? Math.min(subtotalVnd - discountVnd, tierDiscountVnd(subtotalVnd, input.tierDiscount.ratio)) : 0
  const tierVnd = Math.min(rawTierVnd, maxDiscountVnd - discountVnd)
  const afterDiscount = subtotalVnd - discountVnd - tierVnd
  const free =
    input.shipping.freeShippingAll === true ||
    promotionWaivesShipping(input.promotion) ||
    (input.shipping.freeShippingOverVnd !== null && afterDiscount >= input.shipping.freeShippingOverVnd)
  const shippingFeeVnd = input.zone && !free ? input.zone.feeVnd : 0
  // PO 08/10/2026: "Giảm %" tính trên TỔNG đơn (tiền hoa sau mã giảm giá + phí giao)
  const rawPromoVnd = promotionDiscountVnd(input.promotion, afterDiscount + shippingFeeVnd)
  const promoVnd = Math.min(rawPromoVnd, maxDiscountVnd - discountVnd - tierVnd)
  const capped = discountVnd < rawVoucherVnd || tierVnd < rawTierVnd || promoVnd < rawPromoVnd
  const surchargeVnd = input.surcharge && input.surcharge.vnd > 0 ? input.surcharge.vnd : 0
  const peakVnd = input.peakHour && input.peakHour.vnd > 0 ? input.peakHour.vnd : 0
  return {
    unitPriceVnd: input.unitPriceVnd,
    quantity,
    subtotalVnd,
    discountVnd,
    shippingFeeVnd,
    totalVnd: afterDiscount + shippingFeeVnd - promoVnd + surchargeVnd + peakVnd,
    ...(promoVnd > 0 ? { promotionDiscountVnd: promoVnd } : {}),
    ...(capped ? { discountCapped: true as const } : {}),
    shippingZone: input.zone ? { id: input.zone.id, name: input.zone.name } : null,
    voucherCode: input.voucher?.code ?? null,
    ...(surchargeVnd > 0 && input.surcharge ? { holidaySurchargeVnd: surchargeVnd, holidayName: input.surcharge.name } : {}),
    ...(tierVnd > 0 && input.tierDiscount ? { tierDiscountVnd: tierVnd, tierLabel: input.tierDiscount.label } : {}),
    ...(peakVnd > 0 && input.peakHour ? { peakHourSurchargeVnd: peakVnd, peakHourLabel: input.peakHour.label } : {}),
  }
}

/**
 * Báo giá cho mẫu chưa niêm yết giá: chưa tính tiền hàng, phí giao hay giảm
 * giá — cửa hàng báo trọn gói sau khi nhận đơn.
 */
export function awaitingQuote(quantity: number, zone: ShippingZone | null): BrochureQuote {
  return {
    unitPriceVnd: 0,
    quantity: Math.min(Math.max(Math.round(quantity), 1), MAX_ORDER_QUANTITY),
    subtotalVnd: 0,
    discountVnd: 0,
    shippingFeeVnd: 0,
    totalVnd: 0,
    shippingZone: zone ? { id: zone.id, name: zone.name } : null,
    voucherCode: null,
    awaitingQuote: true,
  }
}

/** Khung giờ bật/tắt: chỉ giữ id hợp lệ; tắt hết khung và tắt giờ cụ thể → về mặc định (luôn còn lựa chọn). */
function parseSlotSettings(slots: unknown, allowCustom: unknown): Pick<ShippingConfig, "slotIds" | "allowCustomTime"> {
  const out: Pick<ShippingConfig, "slotIds" | "allowCustomTime"> = {}
  if (Array.isArray(slots)) out.slotIds = DELIVERY_SLOT_IDS.filter((id) => slots.includes(id))
  if (allowCustom === false) out.allowCustomTime = false
  if (out.slotIds?.length === 0 && out.allowCustomTime === false) return {}
  return out
}
