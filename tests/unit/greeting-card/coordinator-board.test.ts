import { describe, expect, it } from "vitest"
import { slotStartHour, sortByDelivery } from "@/modules/greeting-card/domain/coordinator-board"

describe("bảng việc Điều phối — xếp theo giờ giao", () => {
  it("giờ bắt đầu: khung 2 tiếng, giờ cụ thể, không chọn khung xếp cuối ngày", () => {
    expect(slotStartHour("10:00 - 12:00")).toBe(10)
    expect(slotStartHour("Giờ cụ thể: 09:30")).toBe(9.5)
    expect(slotStartHour("Trong ngày")).toBe(24)
    expect(slotStartHour(null)).toBe(24)
  })

  it("ngày giao trước, rồi giờ sớm, rồi đơn đặt trước; đơn thiếu ngày xuống cuối", () => {
    const o = (id: string, date: string | null, slot: string | null, created: string) => ({ id, delivery_window: date ? { date, timeSlot: slot } : null, created_at: created })
    const sorted = sortByDelivery([
      o("c", "2026-10-20", "14:00 - 16:00", "2026-10-08T01:00:00Z"),
      o("x", null, null, "2026-10-01T00:00:00Z"),
      o("a", "2026-10-19", "18:00 - 20:00", "2026-10-09T00:00:00Z"),
      o("b2", "2026-10-20", "Giờ cụ thể: 08:15", "2026-10-08T05:00:00Z"),
      o("b1", "2026-10-20", "08:00 - 10:00", "2026-10-08T06:00:00Z"),
    ])
    expect(sorted.map((x) => x.id)).toEqual(["a", "b1", "b2", "c", "x"])
  })
})
