import { describe, expect, it } from "vitest"

import { deliveryWindowChangeEvent, formatDeliveryWindowValue } from "../delivery-window-change"

describe("lịch sử đổi giờ giao (4.6)", () => {
  it("ghi giá trị cũ, mới, người đổi, lý do", () => {
    expect(deliveryWindowChangeEvent({ date: "2026-11-14", timeSlot: "14:00 - 16:00" }, { date: "2026-11-14", timeSlot: "16:00 - 18:00" }, "u1", "Khách bận họp")).toEqual({
      axis: "delivery_window", fromValue: "2026-11-14 14:00 - 16:00", toValue: "2026-11-14 16:00 - 18:00", actorId: "u1", reason: "Khách bận họp",
    })
  })

  it("không đổi thì không ghi; chưa có giờ cũ thì giá trị cũ để trống", () => {
    expect(deliveryWindowChangeEvent({ date: "2026-11-14" }, { date: "2026-11-14" }, "u1", "x")).toBeNull()
    expect(deliveryWindowChangeEvent(null, { date: "2026-11-15" }, null, "Hẹn giờ")?.fromValue).toBeNull()
    expect(formatDeliveryWindowValue(undefined)).toBe("")
  })
})
