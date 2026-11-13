import { describe, expect, it } from "vitest"
import { parseShippingConfig } from "@/modules/greeting-card/domain/brochure-pricing"
import {
  DELIVERY_SLOTS,
  availableSlots,
  customTimeLabel,
  deliveryScheduleError,
  earliestDeliveryDate,
  parseCustomTime,
} from "@/modules/greeting-card/domain/delivery-schedule"
import { resolveOrderPolicies } from "@/modules/greeting-card/domain/order-policies"
import type { PublicAppliedPolicies } from "@/modules/greeting-card/domain/store-policy"
import { calculateExpectedStepTimeline, parseStepSla } from "@/modules/greeting-card/domain/step-sla"

const at = (vnHour: number, min = 0) => new Date(Date.UTC(2026, 9, 20, vnHour - 7, min, 0))
const TODAY = "2026-10-20"
const TOMORROW = "2026-10-21"

describe("khung giờ giao 2 tiếng — bật/tắt trong cài đặt", () => {
  it("mọi khung đều dài đúng 2 tiếng, không chồng nhau", () => {
    DELIVERY_SLOTS.forEach((s, i) => {
      expect(s.endHour - s.startHour).toBe(2)
      if (i > 0) expect(s.startHour).toBe(DELIVERY_SLOTS[i - 1]!.endHour)
    })
  })

  it("chỉ hiện và chỉ nhận khung tiệm đang bật", () => {
    const cfg = parseShippingConfig({ brochure_shipping: { delivery_slots: ["08-10", "18-20", "bogus"] } })
    expect(cfg.slotIds).toEqual(["08-10", "18-20"])
    expect(availableSlots(TOMORROW, cfg, at(9))).toEqual(["08:00 - 10:00", "18:00 - 20:00"])
    expect(deliveryScheduleError(TOMORROW, "14:00 - 16:00", cfg, at(9))).toContain("không nhận giao")
    expect(deliveryScheduleError(TOMORROW, "18:00 - 20:00", cfg, at(9))).toBeNull()
  })

  it("nhãn lạ / nhãn cũ bị từ chối ở máy chủ", () => {
    expect(deliveryScheduleError(TOMORROW, "Buổi sáng (8h - 12h)", {}, at(9))).not.toBeNull()
  })

  it("tắt hết khung và tắt giờ cụ thể → về mặc định, khách luôn còn lựa chọn", () => {
    const cfg = parseShippingConfig({ brochure_shipping: { delivery_slots: [], allow_custom_time: false } })
    expect(availableSlots(TOMORROW, cfg, at(9))).toHaveLength(DELIVERY_SLOTS.length)
  })

  it("chỉ bật giờ cụ thể: hôm nay vẫn đặt được khi còn kịp", () => {
    const cfg = parseShippingConfig({ brochure_shipping: { delivery_slots: [] } })
    expect(availableSlots(TODAY, cfg, at(10))).toEqual([])
    expect(earliestDeliveryDate(cfg, at(10))).toBe(TODAY)
  })
})

describe("giờ cụ thể khách tự nhập", () => {
  it("nhận HH:MM trong khung 07:00–22:00", () => {
    expect(parseCustomTime(customTimeLabel("15:30"))).toBe(15.5)
    expect(parseCustomTime(customTimeLabel("06:59"))).toBeNull()
    expect(parseCustomTime(customTimeLabel("22:30"))).toBeNull()
    expect(parseCustomTime(customTimeLabel("9h"))).toBeNull()
    expect(parseCustomTime(customTimeLabel(""))).toBeNull()
  })

  it("kiểm giờ chuẩn bị, giờ chốt và cài đặt tắt", () => {
    expect(deliveryScheduleError(TODAY, customTimeLabel("15:30"), { prepHours: 3 }, at(10))).toBeNull()
    expect(deliveryScheduleError(TODAY, customTimeLabel("11:00"), { prepHours: 3 }, at(10))).toContain("không còn kịp")
    expect(deliveryScheduleError(TOMORROW, customTimeLabel("25:00"), {}, at(10))).toContain("HH:MM")
    expect(deliveryScheduleError(TOMORROW, customTimeLabel(""), {}, at(10))).toContain("HH:MM")
    const off = parseShippingConfig({ brochure_shipping: { allow_custom_time: false } })
    expect(deliveryScheduleError(TOMORROW, customTimeLabel("15:30"), off, at(10))).toContain("chưa nhận hẹn giờ cụ thể")
  })

  it("dòng thời gian dự kiến lấy đúng giờ khách hẹn", () => {
    const tl = calculateExpectedStepTimeline(TOMORROW, customTimeLabel("15:30"), parseStepSla({}))
    expect(tl?.delivering?.endIso).toBe(new Date("2026-10-21T15:30:00+07:00").toISOString())
  })
})

describe("ưu đãi & thỏa thuận lúc đặt hoa", () => {
  const policies = (over: Partial<PublicAppliedPolicies> = {}): PublicAppliedPolicies => ({
    promotions: [
      { id: "p1", title: "Tặng thiệp", customerText: "Thiệp viết tay", kind: "GIFT", percent: null },
      { id: "p2", title: "Thêm 3 cành", customerText: "Hồng thêm", kind: "GIFT", percent: null },
    ],
    commitments: [],
    agreements: [
      { id: "a1", title: "Hoa thay thế", customerText: "…" },
      { id: "a2", title: "Màu sai khác", customerText: "…" },
    ],
    allowCustomerPromotionChoice: true,
    ...over,
  })

  it("khách chọn đúng MỘT ưu đãi trong danh sách", () => {
    const r = resolveOrderPolicies(policies(), { selectedPromotionId: "p2", confirmedTerms: true })
    expect(r.ok && r.snapshot.promotion?.id).toBe("p2")
  })

  it("ưu đãi không thuộc bộ sưu tập → từ chối", () => {
    const r = resolveOrderPolicies(policies(), { selectedPromotionId: "p9", confirmedTerms: true })
    expect(r).toMatchObject({ ok: false, field: "selectedPromotionId" })
  })

  it("tiệm không cho chọn → luôn ưu đãi đầu tiên, bỏ qua lựa chọn client", () => {
    const r = resolveOrderPolicies(policies({ allowCustomerPromotionChoice: false }), { selectedPromotionId: "p2", confirmedTerms: true })
    expect(r.ok && r.snapshot.promotion?.id).toBe("p1")
  })

  it("có thỏa thuận mà chưa xác nhận → từ chối; xác nhận → lưu đủ mọi thỏa thuận", () => {
    expect(resolveOrderPolicies(policies(), { selectedPromotionId: "p1" })).toMatchObject({ ok: false, field: "confirmedTerms" })
    const r = resolveOrderPolicies(policies(), { selectedPromotionId: "p1", confirmedTerms: true })
    expect(r.ok && r.snapshot.agreements.map((a) => a.id)).toEqual(["a1", "a2"])
  })

  it("không có thỏa thuận thì không bắt xác nhận", () => {
    const r = resolveOrderPolicies(policies({ agreements: [], promotions: [] }), {})
    expect(r).toMatchObject({ ok: true, snapshot: { promotion: null, termsConfirmed: false } })
  })
})
