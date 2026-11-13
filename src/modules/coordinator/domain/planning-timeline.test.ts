import { describe, expect, it } from "vitest"
import { computeLatestStarts } from "./planning-timeline"

describe("computeLatestStarts (ĐP-4a.9, §4.2)", () => {
  const deliveryTargetAt = new Date("2026-09-27T18:00:00.000Z")

  it("tính ngược đủ 4 mốc khi có đủ khoảng đệm", () => {
    const r = computeLatestStarts(deliveryTargetAt, {
      plannedDeliveryMinutes: 30,
      plannedPickupMinutes: 15,
      plannedQcBufferMinutes: 10,
      plannedProductionMinutes: 90,
    })
    expect(r.latestDispatchStart?.toISOString()).toBe("2026-09-27T17:30:00.000Z")
    expect(r.latestPickupStart?.toISOString()).toBe("2026-09-27T17:15:00.000Z")
    expect(r.latestQCStart?.toISOString()).toBe("2026-09-27T17:05:00.000Z")
    expect(r.latestProductionStart?.toISOString()).toBe("2026-09-27T15:35:00.000Z")
  })

  it("không có deliveryTargetAt thì mọi mốc đều null", () => {
    const r = computeLatestStarts(null, { plannedDeliveryMinutes: 30 })
    expect(r.latestDispatchStart).toBeNull()
    expect(r.latestPickupStart).toBeNull()
    expect(r.latestQCStart).toBeNull()
    expect(r.latestProductionStart).toBeNull()
  })

  it("thiếu khoảng đệm thì coi là 0 phút, không ném lỗi", () => {
    const r = computeLatestStarts(deliveryTargetAt, {})
    expect(r.latestDispatchStart?.toISOString()).toBe(deliveryTargetAt.toISOString())
    expect(r.latestProductionStart?.toISOString()).toBe(deliveryTargetAt.toISOString())
  })

  it("khoảng đệm âm bị coi là 0 (dữ liệu hỏng không kéo lùi mốc)", () => {
    const r = computeLatestStarts(deliveryTargetAt, { plannedDeliveryMinutes: -10 })
    expect(r.latestDispatchStart?.toISOString()).toBe(deliveryTargetAt.toISOString())
  })
})
