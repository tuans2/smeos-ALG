import { describe, it, expect } from "vitest"
import { classifyOrderTimeTier } from "../order-time-tier"

describe("classifyOrderTimeTier — phân loại khung thời gian hiển thị đơn hàng", () => {
  const VN_OFFSET_MS = 7 * 3_600_000
  // Giả lập mốc 10:00 ngày 2026-10-14 (giờ VN)
  const nowMs = Date.parse("2026-10-14T03:00:00Z") // 10:00 VN

  it("ưu tiên cờ isStuck hoặc slaState OVERDUE thành OVERDUE", () => {
    expect(
      classifyOrderTimeTier({ isStuck: true, deliveryDate: "2026-10-14", deliveryTimeSlot: "14:00 - 16:00" }, nowMs)
    ).toBe("OVERDUE")

    expect(
      classifyOrderTimeTier({ slaState: "OVERDUE", deliveryDate: "2026-10-15" }, nowMs)
    ).toBe("OVERDUE")
  })

  it("nhận diện đơn quá ngày giao trong quá khứ là OVERDUE", () => {
    expect(
      classifyOrderTimeTier({ deliveryDate: "2026-10-13", deliveryTimeSlot: "08:00 - 10:00" }, nowMs)
    ).toBe("OVERDUE")
  })

  it("nhận diện đơn quá khung giờ giao trong ngày (> 2 tiếng) là OVERDUE", () => {
    // Bây giờ là 10:00, khung 07:00 (đã qua 3 tiếng)
    expect(
      classifyOrderTimeTier({ deliveryDate: "2026-10-14", deliveryTimeSlot: "Giờ cụ thể: 07:00" }, nowMs)
    ).toBe("OVERDUE")
  })

  it("nhận diện đơn sắp đến hạn (trong vòng 1.5 giờ hoặc đang trong khung giờ) là URGENT", () => {
    // Bây giờ là 10:00, khung 10:00 - 12:00 -> Đang trong khung giờ -> URGENT
    expect(
      classifyOrderTimeTier({ deliveryDate: "2026-10-14", deliveryTimeSlot: "10:00 - 12:00" }, nowMs)
    ).toBe("URGENT")

    // Bây giờ là 10:00, khung 11:00 cụ thể (cách 1 tiếng) -> URGENT
    expect(
      classifyOrderTimeTier({ deliveryDate: "2026-10-14", deliveryTimeSlot: "Giờ cụ thể: 11:00" }, nowMs)
    ).toBe("URGENT")
  })

  it("nhận diện đơn trong ngày nhưng ở ca sau (> 1.5 giờ) là CURRENT", () => {
    // Bây giờ là 10:00, khung 14:00 - 16:00 (cách 4 tiếng) -> CURRENT
    expect(
      classifyOrderTimeTier({ deliveryDate: "2026-10-14", deliveryTimeSlot: "14:00 - 16:00" }, nowMs)
    ).toBe("CURRENT")
  })

  it("nhận diện đơn ngày mai hoặc tương lai là FUTURE", () => {
    expect(
      classifyOrderTimeTier({ deliveryDate: "2026-10-15", deliveryTimeSlot: "08:00 - 10:00" }, nowMs)
    ).toBe("FUTURE")
  })
})
