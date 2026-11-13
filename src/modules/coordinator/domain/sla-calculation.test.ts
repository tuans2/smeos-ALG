import { describe, expect, it } from "vitest"
import { computeDeliveryTargetAt } from "./sla-calculation"

describe("computeDeliveryTargetAt (ĐP-4a.2, §2.15.2)", () => {
  const orderCreatedAt = new Date("2026-09-26T10:00:00.000Z")
  const requestedDeliveryAt = new Date("2026-09-26T18:00:00.000Z")

  it("OFFSET (EXPRESS) — cộng N phút từ lúc chốt đơn, dùng tham số danh mục", () => {
    const result = computeDeliveryTargetAt({
      behavior: "OFFSET",
      params: { offsetMinutes: 90 },
      orderCreatedAt,
      requestedDeliveryAt,
      deliveryWindowStart: null,
      deliveryWindowEnd: null,
    })
    expect(result?.toISOString()).toBe("2026-09-26T11:30:00.000Z")
  })

  it("OFFSET — thiếu params thì dùng mặc định 120 phút (behaviors.ts)", () => {
    const result = computeDeliveryTargetAt({
      behavior: "OFFSET",
      params: null,
      orderCreatedAt,
      requestedDeliveryAt,
      deliveryWindowStart: null,
      deliveryWindowEnd: null,
    })
    expect(result?.toISOString()).toBe("2026-09-26T12:00:00.000Z")
  })

  it("EXACT (EXACT_TIME) — dùng đúng giờ Sales hẹn, không cộng trừ gì", () => {
    const result = computeDeliveryTargetAt({
      behavior: "EXACT",
      params: { toleranceMinutes: 30 },
      orderCreatedAt,
      requestedDeliveryAt,
      deliveryWindowStart: null,
      deliveryWindowEnd: null,
    })
    expect(result).toBe(requestedDeliveryAt)
  })

  it("WINDOW (TIME_SLOT) — dùng cuối khung giờ khi có", () => {
    const windowEnd = new Date("2026-09-26T20:00:00.000Z")
    const result = computeDeliveryTargetAt({
      behavior: "WINDOW",
      params: null,
      orderCreatedAt,
      requestedDeliveryAt,
      deliveryWindowStart: new Date("2026-09-26T19:00:00.000Z"),
      deliveryWindowEnd: windowEnd,
    })
    expect(result).toBe(windowEnd)
  })

  it("WINDOW — thiếu khung giờ riêng thì dùng giờ Sales hẹn làm dự phòng", () => {
    const result = computeDeliveryTargetAt({
      behavior: "WINDOW",
      params: null,
      orderCreatedAt,
      requestedDeliveryAt,
      deliveryWindowStart: null,
      deliveryWindowEnd: null,
    })
    expect(result).toBe(requestedDeliveryAt)
  })

  it("END_OF_DAY (SAME_DAY) — trước giờ đóng cửa của ngày giao, tham số danh mục", () => {
    const result = computeDeliveryTargetAt({
      behavior: "END_OF_DAY",
      params: { closingHour: 20 },
      orderCreatedAt,
      requestedDeliveryAt,
      deliveryWindowStart: null,
      deliveryWindowEnd: null,
    })
    expect(result?.getHours()).toBe(20)
    expect(result?.getMinutes()).toBe(0)
  })

  it("END_OF_DAY — không có giờ hẹn thì lấy ngày lúc chốt đơn làm ngày giao", () => {
    const result = computeDeliveryTargetAt({
      behavior: "END_OF_DAY",
      params: null,
      orderCreatedAt,
      requestedDeliveryAt: null,
      deliveryWindowStart: null,
      deliveryWindowEnd: null,
    })
    expect(result?.getDate()).toBe(orderCreatedAt.getDate())
    expect(result?.getHours()).toBe(21) // mặc định behaviors.ts
  })

  it("không chọn serviceLevel (behavior = null) — giữ nguyên hành vi trước ĐP-4a.2: dùng đúng giờ Sales hẹn", () => {
    const result = computeDeliveryTargetAt({
      behavior: null,
      params: null,
      orderCreatedAt,
      requestedDeliveryAt,
      deliveryWindowStart: null,
      deliveryWindowEnd: null,
    })
    expect(result).toBe(requestedDeliveryAt)
  })

  it("hành vi lạ (dữ liệu hỏng/chưa biết) — không ném lỗi, rơi về giờ Sales hẹn", () => {
    const result = computeDeliveryTargetAt({
      behavior: "KHONG_TON_TAI",
      params: null,
      orderCreatedAt,
      requestedDeliveryAt,
      deliveryWindowStart: null,
      deliveryWindowEnd: null,
    })
    expect(result).toBe(requestedDeliveryAt)
  })
})
