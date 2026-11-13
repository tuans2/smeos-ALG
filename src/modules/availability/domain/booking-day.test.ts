import { describe, expect, it } from "vitest"

import { dateToIsoDay, isValidIsoDay, isoDayToDate } from "./booking-day"

describe("booking-day", () => {
  it("chỉ nhận ngày có thật trên lịch", () => {
    expect(isValidIsoDay("2026-10-22")).toBe(true)
    expect(isValidIsoDay("2028-02-29")).toBe(true)
    expect(isValidIsoDay("2026-02-29")).toBe(false)
    expect(isValidIsoDay("2026-13-01")).toBe(false)
    expect(isValidIsoDay("22/10/2026")).toBe(false)
    expect(isValidIsoDay("")).toBe(false)
  })

  it("đổi qua lại với Date 00:00 UTC, không lệch ngày", () => {
    const d = isoDayToDate("2026-12-31")
    expect(d.toISOString()).toBe("2026-12-31T00:00:00.000Z")
    expect(dateToIsoDay(d)).toBe("2026-12-31")
  })

  it("ngày sai → lỗi 422 có câu tiếng Việt", () => {
    expect(() => isoDayToDate("2026-02-30")).toThrowError(/không hợp lệ/)
    try {
      isoDayToDate("x")
    } catch (error) {
      expect((error as { status?: number }).status).toBe(422)
    }
  })
})
