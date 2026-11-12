import { describe, expect, it } from "vitest"

import { deliveryDeadlineMs, slotEndMinutes } from "@/modules/orders/domain/delivery-slot"
import { lateMinutes } from "@/modules/greeting-card/use-cases/craft-fee-deductions"
import { parseDeliveryTimestampMs } from "@/modules/greeting-card/domain/subcontract-countdown"

/**
 * Audit BL-24 (11/11/2026): khung giờ dạng `"14h-16h"` hay chữ tự do bị đọc thành 10:00 sáng → đơn giao 15:00 tính
 * "trễ 300 phút" và chi nhánh bị trừ phí gia công oan.
 */
const at = (iso: string) => new Date(iso).getTime()

describe("đọc khung giờ giao", () => {
  it("lấy giờ cuối của khoảng, mọi cách viết thường gặp", () => {
    expect(slotEndMinutes("08:00 - 10:00")).toBe(600)
    expect(slotEndMinutes("14h-16h")).toBe(960)
    expect(slotEndMinutes("14h30 – 16h30")).toBe(990)
    expect(slotEndMinutes("8h đến 10h")).toBe(600)
    expect(slotEndMinutes("Giờ cụ thể: 15:30")).toBe(930)
    expect(slotEndMinutes("Trước 12h")).toBe(720)
  })

  it("không nêu giờ → null", () => {
    expect(slotEndMinutes(null)).toBeNull()
    expect(slotEndMinutes("")).toBeNull()
    expect(slotEndMinutes("Buổi chiều")).toBeNull()
    expect(slotEndMinutes("Giao lần 2")).toBeNull()
    expect(slotEndMinutes("25:00 - 26:00")).toBeNull()
  })

  it("hạn giao theo giờ Việt Nam; thiếu giờ → null", () => {
    expect(deliveryDeadlineMs("2026-11-12", "14h-16h")).toBe(at("2026-11-12T16:00:00+07:00"))
    expect(deliveryDeadlineMs("2026-11-12", null)).toBeNull()
    expect(deliveryDeadlineMs(null, "14h-16h")).toBeNull()
  })

  it("đồng hồ đếm ngược vẫn dùng mốc 10:00 khi không nêu giờ, nhưng đọc đúng `14h-16h`", () => {
    expect(parseDeliveryTimestampMs("2026-11-12", null)).toBe(at("2026-11-12T10:00:00+07:00"))
    expect(parseDeliveryTimestampMs("2026-11-12", "14h-16h")).toBe(at("2026-11-12T16:00:00+07:00"))
  })
})

describe("phút trễ để trừ phí gia công", () => {
  const delivered = new Date("2026-11-12T15:00:00+07:00")

  it("giao 15:00 cho khung 14h-16h → không trễ", () => {
    expect(lateMinutes({ date: "2026-11-12", timeSlot: "14h-16h" }, delivered)).toBeLessThanOrEqual(0)
  })

  it("đơn không có giờ hẹn → không tính trễ", () => {
    expect(lateMinutes({ date: "2026-11-12" }, delivered)).toBe(0)
    expect(lateMinutes({ date: "2026-11-12", timeSlot: "Buổi chiều" }, delivered)).toBe(0)
  })

  it("giao 17:30 cho khung 14:00 - 16:00 → trễ 90 phút", () => {
    expect(lateMinutes({ date: "2026-11-12", timeSlot: "14:00 - 16:00" }, new Date("2026-11-12T17:30:00+07:00"))).toBe(90)
  })
})
