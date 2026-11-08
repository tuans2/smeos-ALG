import { describe, expect, it } from "vitest"

import { formatDeliveryWindow } from "../order-ticket-format"

describe("formatDeliveryWindow — phiếu xem trước không in chữ 'undefined' (UJ-07)", () => {
  it("chưa có khung giao → câu tiếng Việt", () => {
    expect(formatDeliveryWindow(null)).toBe("Chưa hẹn ngày giao")
    expect(formatDeliveryWindow(undefined)).toBe("Chưa hẹn ngày giao")
  })

  it("có ngày, chưa có giờ → chỉ ngày", () => {
    expect(formatDeliveryWindow({ date: "2026-11-08" })).toBe("2026-11-08")
  })

  it("có ngày và giờ", () => {
    expect(formatDeliveryWindow({ date: "2026-11-08", timeSlot: "14h-16h" })).toBe("2026-11-08 (14h-16h)")
  })
})
