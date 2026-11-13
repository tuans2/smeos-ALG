import { describe, it, expect } from "vitest"
import { calculateNights } from "../homestay-order-fields"

describe("HomestayOrderFields - calculateNights", () => {
  it("trả về 1 đêm nếu ngày nhận hoặc trả phòng rỗng", () => {
    expect(calculateNights("", "")).toBe(1)
    expect(calculateNights("2026-10-18", "")).toBe(1)
    expect(calculateNights("", "2026-10-20")).toBe(1)
  })

  it("tính chính xác số đêm giữa check-in và check-out", () => {
    expect(calculateNights("2026-10-18", "2026-10-19")).toBe(1)
    expect(calculateNights("2026-10-18", "2026-10-20")).toBe(2)
    expect(calculateNights("2026-10-18", "2026-10-25")).toBe(7)
  })

  it("trả về tối thiểu 1 đêm nếu ngày trả phòng nhỏ hơn hoặc bằng ngày nhận phòng", () => {
    expect(calculateNights("2026-10-20", "2026-10-18")).toBe(1)
    expect(calculateNights("2026-10-18", "2026-10-18")).toBe(1)
  })
})
