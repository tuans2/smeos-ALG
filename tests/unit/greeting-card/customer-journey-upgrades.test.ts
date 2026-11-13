import { describe, expect, it } from "vitest"
import { availableSlots, deliveryScheduleError, earliestDeliveryDate, DELIVERY_SLOTS } from "@/modules/greeting-card/domain/delivery-schedule"
import { parseShippingConfig } from "@/modules/greeting-card/domain/brochure-pricing"
import { toShopContact, zaloChatUrl } from "@/modules/greeting-card/domain/shop-contact"
import { parsePaymentPolicy, paymentHoldUntil } from "@/modules/greeting-card/domain/brochure-payment-policy"
import { NOTIFY_EVENTS, smsText } from "@/modules/greeting-card/domain/customer-notifications"

// 10:00 sáng giờ VN = 03:00 UTC
const at = (vnHour: number) => new Date(Date.UTC(2026, 9, 20, vnHour - 7, 0, 0))
const TODAY = "2026-10-20"
const TOMORROW = "2026-10-21"

describe("giờ chốt đơn & thời gian chuẩn bị", () => {
  it("không cấu hình: hôm nay vẫn chọn được, chỉ bỏ khung 2 tiếng đã qua", () => {
    expect(earliestDeliveryDate({}, at(10))).toBe(TODAY)
    expect(availableSlots(TODAY, {}, at(13))).toEqual(["16:00 - 18:00", "18:00 - 20:00", "20:00 - 22:00"])
  })

  it("qua giờ chốt: sớm nhất là ngày mai và báo lỗi rõ ràng", () => {
    const cfg = { sameDayCutoffHour: 16 }
    expect(earliestDeliveryDate(cfg, at(17))).toBe(TOMORROW)
    expect(deliveryScheduleError(TODAY, "18:00 - 20:00", cfg, at(17))).toContain("16h")
    expect(deliveryScheduleError(TOMORROW, "08:00 - 10:00", cfg, at(17))).toBeNull()
  })

  it("thời gian chuẩn bị loại khung giờ không kịp", () => {
    const cfg = { prepHours: 3 }
    expect(availableSlots(TODAY, cfg, at(10))).not.toContain("10:00 - 12:00")
    expect(deliveryScheduleError(TODAY, "10:00 - 12:00", cfg, at(10))).toContain("Khung giờ")
    expect(deliveryScheduleError(TODAY, "14:00 - 16:00", cfg, at(10))).toBeNull()
  })

  it("ngày tương lai mở đủ khung giờ", () => {
    expect(availableSlots(TOMORROW, { sameDayCutoffHour: 8, prepHours: 5 }, at(20))).toHaveLength(DELIVERY_SLOTS.length)
  })

  it("đọc cấu hình từ settings, bỏ giá trị lạ", () => {
    const ok = parseShippingConfig({ brochure_shipping: { zones: [], same_day_cutoff_hour: 16, prep_hours: 2 } })
    expect(ok.sameDayCutoffHour).toBe(16)
    expect(ok.prepHours).toBe(2)
    const bad = parseShippingConfig({ brochure_shipping: { zones: [], same_day_cutoff_hour: 30, prep_hours: -1 } })
    expect(bad.sameDayCutoffHour).toBeUndefined()
    expect(bad.prepHours).toBeUndefined()
  })
})

describe("thông tin liên hệ cửa hàng", () => {
  it("link Zalo chỉ cho số di động VN", () => {
    expect(zaloChatUrl("0901 234 567")).toBe("https://zalo.me/0901234567")
    expect(zaloChatUrl("+84901234567")).toBe("https://zalo.me/0901234567")
    expect(zaloChatUrl("028 3822 1234")).toBeNull()
    expect(zaloChatUrl(null)).toBeNull()
  })

  it("chuẩn hoá SĐT và địa chỉ rỗng", () => {
    expect(toShopContact({ name: "Mộc Lan", phone: " 0901 234 567 ", address: "  ", logoUrl: null })).toEqual({
      name: "Mộc Lan",
      phone: "0901234567",
      zaloUrl: "https://zalo.me/0901234567",
      address: null,
      logoUrl: null,
      zaloQrUrl: null,
    })
  })
})

describe("giữ đơn chờ chuyển khoản", () => {
  const created = new Date("2026-10-20T03:00:00Z")

  it("bật 30 phút → hạn giữ đơn đúng 30 phút sau khi đặt", () => {
    const policy = parsePaymentPolicy({ brochure_policy: { hold_minutes: 30 } })
    expect(paymentHoldUntil(policy, { paidVnd: 0, createdAt: created })).toBe("2026-10-20T03:30:00.000Z")
  })

  it("đã trả tiền hoặc tiệm không bật → không đếm ngược", () => {
    expect(paymentHoldUntil(parsePaymentPolicy({ brochure_policy: { hold_minutes: 30 } }), { paidVnd: 100, createdAt: created })).toBeNull()
    expect(paymentHoldUntil(parsePaymentPolicy({}), { paidVnd: 0, createdAt: created })).toBeNull()
    expect(parsePaymentPolicy({ brochure_policy: { hold_minutes: 2 } }).holdMinutes).toBeUndefined()
  })
})

describe("tin nhắn đã nhận đơn", () => {
  it("có mốc ORDER_RECEIVED, SMS không dấu kèm link theo dõi", () => {
    expect(NOTIFY_EVENTS[0]).toBe("ORDER_RECEIVED")
    const text = smsText("ORDER_RECEIVED", {
      order_code: "DH1", customer_name: "A", shop_name: "Moc Lan", status: "", amount: "", tracking_url: "https://x/b/T01-ABC",
    })
    expect(text).toContain("Da nhan don DH1")
    expect(text).toContain("https://x/b/T01-ABC")
  })
})

import { composeAddress, normalizeOrderAddress, validateAddressParts } from "@/modules/greeting-card/domain/delivery-address"

describe("địa chỉ giao 5 ô", () => {
  const parts = { houseNumber: "45", street: "Lê Lợi", ward: "Phường Bến Thành", district: "", province: "TP. Hồ Chí Minh" }

  it("ghép một dòng, bỏ ô trống (quận/huyện tuỳ chọn)", () => {
    expect(composeAddress(parts)).toBe("45 Lê Lợi, Phường Bến Thành, TP. Hồ Chí Minh")
    expect(composeAddress({ ...parts, district: "Quận 1" })).toBe("45 Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh")
  })

  it("bắt buộc số nhà, đường, phường/xã, tỉnh/thành", () => {
    expect(Object.keys(validateAddressParts({ houseNumber: "", street: "", ward: "", province: "" }))).toEqual(["houseNumber", "street", "ward", "province"])
    expect(validateAddressParts(parts)).toEqual({})
  })

  it("máy chủ tự ghép dòng địa chỉ từ 5 ô, không tin dòng client gửi", () => {
    const { input, errors } = normalizeOrderAddress({ deliveryAddress: "giả mạo", addressParts: parts })
    expect(errors).toEqual({})
    expect(input.deliveryAddress).toBe("45 Lê Lợi, Phường Bến Thành, TP. Hồ Chí Minh")
    expect(normalizeOrderAddress({ deliveryAddress: "123 Đường cũ, Q1" }).input.deliveryAddress).toBe("123 Đường cũ, Q1")
  })
})

import { mediaSelectionError } from "@/modules/greeting-card/domain/media-limits"

describe("giới hạn ảnh/video của điều phối", () => {
  const img = { mimeType: "image/jpeg", sizeBytes: 1000 }
  const vid = (s: number) => ({ mimeType: "video/mp4", sizeBytes: 1000, durationSeconds: s })

  it("1–5 ảnh, 0–2 video ≤ 15 giây", () => {
    expect(mediaSelectionError([img])).toBeNull()
    expect(mediaSelectionError([img, vid(15), vid(10)])).toBeNull()
    expect(mediaSelectionError([vid(5)])).toBe("Cần ít nhất 1 ảnh")
    expect(mediaSelectionError(Array(6).fill(img))).toBe("Tối đa 5 ảnh")
    expect(mediaSelectionError([img, vid(5), vid(5), vid(5)])).toBe("Tối đa 2 video")
    expect(mediaSelectionError([img, vid(20)])).toBe("Mỗi video tối đa 15 giây")
    expect(mediaSelectionError([{ mimeType: "application/pdf" }])).toContain("Chỉ nhận")
  })
})
