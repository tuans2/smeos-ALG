import { describe, expect, it } from "vitest"
import { computeQuote, parseShippingConfig } from "@/modules/greeting-card/domain/brochure-pricing"
import {
  promotionDiscountVnd,
  promotionPricingOf,
  quotedTotalAfterPromotion,
} from "@/modules/greeting-card/domain/promotion-pricing"
import { DEFAULT_PROMOTIONS, resolveAppliedPolicies } from "@/modules/greeting-card/domain/store-policy"
import { customerChoosesPromotion, PROMOTION_CHOICE_MISSING, resolveOrderPolicies, selectPromotion } from "@/modules/greeting-card/domain/order-policies"
import { paymentCheckOf } from "@/modules/greeting-card/domain/payment-check"
import {
  capacityOf,
  countBySlot,
  fullSlotLabels,
  parseSlotCapacity,
  slotIdOfTimeSlot,
} from "@/modules/greeting-card/domain/slot-capacity"

/** PO 08/10/2026: ưu đãi trừ tiền thật (Giảm 10% trên tổng đơn), miễn phí giao mọi đơn, trần 100 đơn/khung. */

const zone = { id: "q1", name: "Quận 1", feeVnd: 30_000 }
const shipping = parseShippingConfig({ brochure_shipping: { zones: [{ id: "q1", name: "Quận 1", fee_vnd: 30_000 }] } })

describe("ưu đãi mặc định và loại tính tiền", () => {
  it("đúng 3 ưu đãi PO chốt: Giảm 10%, Tặng thiệp, Thêm phụ liệu — không còn 'Miễn phí giao hoa' chỉ ghi chú", () => {
    expect(DEFAULT_PROMOTIONS.map((p) => p.title)).toEqual(["Giảm 10%", "Tặng thiệp", "Thêm phụ liệu"])
    const applied = resolveAppliedPolicies({}, {})
    expect(applied.promotions.map((p) => [p.kind, p.percent])).toEqual([["PERCENT_OFF", 10], ["GIFT", null], ["GIFT", null]])
  })

  it("mục cũ không có `kind`: có % hợp lệ → Giảm %, còn lại Tặng kèm; không tự suy miễn ship từ tên", () => {
    expect(promotionPricingOf({ config: { percent: 15 } })).toEqual({ kind: "PERCENT_OFF", percent: 15 })
    expect(promotionPricingOf({})).toEqual({ kind: "GIFT", percent: null })
    expect(promotionPricingOf({ kind: "PERCENT_OFF", config: { percent: 0 } })).toEqual({ kind: "GIFT", percent: null })
    expect(promotionPricingOf({ kind: "HACK" })).toEqual({ kind: "GIFT", percent: null })
  })

  it("chỉ chọn được ưu đãi của bộ sưu tập; tiệm không cho chọn → ưu đãi đầu", () => {
    const applied = resolveAppliedPolicies({}, {})
    expect(selectPromotion(applied, "promo-free-card")).toMatchObject({ ok: true, promotion: { id: "promo-free-card" } })
    expect(selectPromotion(applied, "promo-free-ship")).toMatchObject({ ok: false })
    expect(selectPromotion({ ...applied, allowCustomerPromotionChoice: false }, "promo-free-card")).toMatchObject({ promotion: { id: "promo-discount-10" } })
  })

  it("không chọn sẵn: báo giá chưa chọn → không ưu đãi; đặt đơn chưa chọn → lỗi bắt chọn (PO 08/10/2026)", () => {
    const applied = resolveAppliedPolicies({}, {})
    expect(customerChoosesPromotion(applied)).toBe(true)
    expect(selectPromotion(applied, undefined)).toEqual({ ok: true, promotion: null })
    expect(selectPromotion(applied, undefined, { required: true })).toEqual({ ok: false, message: PROMOTION_CHOICE_MISSING })
    expect(resolveOrderPolicies(applied, { confirmedTerms: true })).toMatchObject({ ok: false, field: "selectedPromotionId" })
    const single = { ...applied, promotions: applied.promotions.slice(0, 1) }
    expect(customerChoosesPromotion(single)).toBe(false)
    expect(selectPromotion(single, undefined, { required: true })).toMatchObject({ ok: true, promotion: { id: "promo-discount-10" } })
  })

  it("Điều hành tạm tắt ưu đãi trong Hồ sơ tiệm → khách không thấy, không chọn được", () => {
    const settings = { store_policies: { promotions: DEFAULT_PROMOTIONS.map((p) => (p.id === "promo-discount-10" ? { ...p, active: false } : p)) } }
    const applied = resolveAppliedPolicies({}, settings)
    expect(applied.promotions.map((p) => p.id)).toEqual(["promo-free-card", "promo-accessory"])
    expect(selectPromotion(applied, "promo-discount-10", { required: true })).toMatchObject({ ok: false })
    const allOff = resolveAppliedPolicies({}, { store_policies: { promotions: DEFAULT_PROMOTIONS.map((p) => ({ ...p, active: false })) } })
    expect(resolveOrderPolicies(allOff, { confirmedTerms: true })).toMatchObject({ ok: true, snapshot: { promotion: null } })
  })
})

describe("tính tiền có ưu đãi", () => {
  const percent10 = { kind: "PERCENT_OFF" as const, percent: 10 }

  it("Giảm 10% trên TỔNG đơn (gồm phí giao)", () => {
    const q = computeQuote({ unitPriceVnd: 500_000, quantity: 1, zone, shipping, voucher: null, promotion: percent10 })
    expect(q).toMatchObject({ subtotalVnd: 500_000, shippingFeeVnd: 30_000, promotionDiscountVnd: 53_000, totalVnd: 477_000 })
  })

  it("miễn phí giao mọi đơn: phí giao 0 ở mọi khu vực; Giảm 10% còn trên tiền hoa", () => {
    const free = parseShippingConfig({ brochure_shipping: { zones: [{ id: "q1", name: "Quận 1", fee_vnd: 30_000 }], free_shipping_all: true } })
    const q = computeQuote({ unitPriceVnd: 350_000, quantity: 2, zone, shipping: free, voucher: null, promotion: percent10 })
    expect(q).toMatchObject({ shippingFeeVnd: 0, promotionDiscountVnd: 70_000, totalVnd: 630_000 })
  })

  it("ưu đãi Tặng kèm không đổi tiền; ưu đãi Miễn phí giao bỏ phí giao", () => {
    const gift = computeQuote({ unitPriceVnd: 400_000, quantity: 1, zone, shipping, voucher: null, promotion: { kind: "GIFT", percent: null } })
    expect(gift.totalVnd).toBe(430_000)
    expect(gift.promotionDiscountVnd).toBeUndefined()
    const ship = computeQuote({ unitPriceVnd: 400_000, quantity: 1, zone, shipping, voucher: null, promotion: { kind: "FREE_SHIPPING", percent: null } })
    expect(ship).toMatchObject({ shippingFeeVnd: 0, totalVnd: 400_000 })
  })

  it("không ưu đãi → tổng như cũ (không đổi đơn đã có)", () => {
    expect(computeQuote({ unitPriceVnd: 400_000, quantity: 1, zone, shipping, voucher: null }).totalVnd).toBe(430_000)
  })

  it("mẫu báo giá sau: máy trừ % khách đã chọn trên giá Điều hành báo; đơn cũ thiếu kind không trừ", () => {
    const ref = { policies: { promotion: { id: "promo-discount-10", title: "Giảm 10%", kind: "PERCENT_OFF", percent: 10 } } }
    expect(quotedTotalAfterPromotion(ref, 900_000)).toEqual({ totalVnd: 810_000, promotionDiscountVnd: 90_000 })
    expect(quotedTotalAfterPromotion({ policies: { promotion: { id: "x", title: "Giảm 10%" } } }, 900_000).totalVnd).toBe(900_000)
    expect(quotedTotalAfterPromotion({}, 900_000).totalVnd).toBe(900_000)
    expect(promotionDiscountVnd(percent10, 0)).toBe(0)
  })

  it("mã giảm giá bị tắt mặc định; bật bằng `voucher_enabled`", () => {
    expect(parseShippingConfig({}).vouchersEnabled).toBeUndefined()
    expect(parseShippingConfig({ brochure_shipping: { voucher_enabled: true } }).vouchersEnabled).toBe(true)
  })

  it("Điều hành thấy ưu đãi khách chọn khi đối chiếu tiền", () => {
    const c = paymentCheckOf({
      total_vnd: 450_000,
      pricing_rule_ref: { unitPriceVnd: 500_000, quantity: 1, promotionDiscountVnd: 50_000, policies: { promotion: { title: "Giảm 10%", kind: "PERCENT_OFF", percent: 10 } } },
      greeting_sessions: [{ product_snapshot: { price: 500_000, name: "Bó 1" } }],
    })
    expect(c.reasons).toContain("Ưu đãi Giảm 10%: −50.000đ")
    expect(c.promotion).toBe("Giảm 10%")
    const gift = paymentCheckOf({ total_vnd: 500_000, pricing_rule_ref: { policies: { promotion: { title: "Tặng thiệp", kind: "GIFT" } } } })
    expect(gift.promotion).toBe("Tặng thiệp (tặng kèm, không đổi tiền)")
  })
})

describe("trần đơn mỗi khung giờ", () => {
  it("mặc định 100 đơn mỗi khung; trần riêng từng khung đè trần chung", () => {
    expect(capacityOf(undefined, "08-10")).toBe(100)
    const cfg = parseSlotCapacity({ default: 40, per_slot: { "10-12": 5, "99-99": 3, "12-14": -1 } })
    expect(cfg).toEqual({ defaultMax: 40, perSlot: { "10-12": 5 } })
    expect(capacityOf(cfg, "10-12")).toBe(5)
    expect(capacityOf(cfg, "12-14")).toBe(40)
  })

  it("giờ cụ thể tính vào khung 2 tiếng chứa giờ đó; 'Trong ngày' không thuộc khung nào", () => {
    expect(slotIdOfTimeSlot("10:00 - 12:00")).toBe("10-12")
    expect(slotIdOfTimeSlot("Giờ cụ thể: 11:30")).toBe("10-12")
    expect(slotIdOfTimeSlot("Giờ cụ thể: 07:15")).toBe("08-10")
    expect(slotIdOfTimeSlot("Giờ cụ thể: 22:00")).toBe("20-22")
    expect(slotIdOfTimeSlot("Trong ngày")).toBeNull()
    expect(slotIdOfTimeSlot(null)).toBeNull()
  })

  it("khung đủ đơn bị báo 'đã kín'", () => {
    const counts = countBySlot(["10:00 - 12:00", "Giờ cụ thể: 10:45", "08:00 - 10:00", "Trong ngày", null])
    expect(counts.get("10-12")).toBe(2)
    expect(fullSlotLabels(counts, parseSlotCapacity({ default: 2 }))).toEqual(["10:00 - 12:00"])
    expect(fullSlotLabels(counts, undefined)).toEqual([])
  })
})
