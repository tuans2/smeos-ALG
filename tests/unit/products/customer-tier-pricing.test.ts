import { describe, expect, it } from "vitest"

import { computeQuote } from "@/modules/greeting-card/domain/brochure-pricing"
import {
  parsePeakHours, parseTierDiscount, peakHourSurchargeFor, slotStartHour, tierDiscountVnd,
} from "@/modules/products/domain/customer-tier-pricing"
import { validatePricingRuleValue } from "@/modules/products/domain/pricing-rules"

/** Checklist ALG 3.1 — chiết khấu hạng khách và phụ phí giờ cao điểm. */
describe("customer-tier-pricing", () => {
  it("đọc tỷ lệ theo hạng; sai hoặc vượt 50% → 0", () => {
    expect(parseTierDiscount({ VIP: 0.1, GOLD: 0.9, SILVER: "x" })).toEqual({ NEW: 0, BRONZE: 0, SILVER: 0, GOLD: 0, VIP: 0.1 })
    expect(parseTierDiscount(null).VIP).toBe(0)
  })

  it("khung giờ hợp lệ mới nhận; nhãn mặc định theo giờ", () => {
    const w = parsePeakHours([{ startHour: 17, endHour: 19, vnd: 30_000 }, { startHour: 20, endHour: 18, vnd: 1 }, { startHour: 8, endHour: 9, vnd: 0 }])
    expect(w).toEqual([{ startHour: 17, endHour: 19, vnd: 30_000, label: "Giờ cao điểm 17h–19h" }])
    expect(parsePeakHours("x")).toEqual([])
  })

  it("giờ giao lấy giờ bắt đầu của khung; phụ phí khi rơi vào [bắt đầu, kết thúc)", () => {
    expect(slotStartHour("17:00 - 19:00")).toBe(17)
    expect(slotStartHour("8h-10h")).toBe(8)
    expect(slotStartHour("Cả ngày")).toBeNull()
    const w = parsePeakHours([{ startHour: 17, endHour: 19, vnd: 30_000 }])
    expect(peakHourSurchargeFor(w, "18:00 - 20:00")?.vnd).toBe(30_000)
    expect(peakHourSurchargeFor(w, "19:00 - 21:00")).toBeNull()
  })

  it("tiền giảm làm tròn nghìn đồng", () => {
    expect(tierDiscountVnd(456_700, 0.1)).toBe(46_000)
  })

  it("kiểm giá trị khi lưu quy tắc giá", () => {
    expect(validatePricingRuleValue("customer_tier_discount", { VIP: 0.1 })).toBe("")
    expect(validatePricingRuleValue("customer_tier_discount", { VIP: 0.6 })).not.toBe("")
    expect(validatePricingRuleValue("customer_tier_discount", { KIM_CUONG: 0.1 })).not.toBe("")
    expect(validatePricingRuleValue("peak_hour_surcharge", [{ startHour: 17, endHour: 19, vnd: 30_000 }])).toBe("")
    expect(validatePricingRuleValue("peak_hour_surcharge", [{ startHour: 19, endHour: 17, vnd: 30_000 }])).not.toBe("")
  })

  it("báo giá: giảm hạng là dòng riêng trừ trên tiền hàng, phụ phí giờ cao điểm cộng vào tổng", () => {
    const q = computeQuote({
      unitPriceVnd: 500_000, quantity: 1, zone: null, voucher: null, promotion: null, surcharge: null,
      shipping: { zones: [], freeShippingOverVnd: null },
      tierDiscount: { ratio: 0.1, label: "Ưu đãi khách hạng VIP" }, peakHour: { vnd: 30_000, label: "Giờ cao điểm 17h–19h" },
    })
    expect(q).toMatchObject({ subtotalVnd: 500_000, tierDiscountVnd: 50_000, tierLabel: "Ưu đãi khách hạng VIP", peakHourSurchargeVnd: 30_000, totalVnd: 480_000 })
  })
})
