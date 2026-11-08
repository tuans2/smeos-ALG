import { describe, expect, it } from "vitest"

import { parseUnpaidExpiryPolicy, unpaidExpiryCutoff, UNPAID_EXPIRY_SETTINGS_KEY } from "../unpaid-order-expiry"

describe("chính sách tự huỷ đơn chưa thanh toán (UJ-12)", () => {
  it("mặc định tắt, 24 giờ", () => {
    expect(parseUnpaidExpiryPolicy(null)).toEqual({ enabled: false, hours: 24 })
    expect(parseUnpaidExpiryPolicy({ [UNPAID_EXPIRY_SETTINGS_KEY]: { enabled: "true" } })).toEqual({ enabled: false, hours: 24 })
  })

  it("bật với số giờ hợp lệ, kẹp trong 2–168 giờ", () => {
    expect(parseUnpaidExpiryPolicy({ [UNPAID_EXPIRY_SETTINGS_KEY]: { enabled: true, hours: 6 } })).toEqual({ enabled: true, hours: 6 })
    expect(parseUnpaidExpiryPolicy({ [UNPAID_EXPIRY_SETTINGS_KEY]: { enabled: true, hours: 0 } }).hours).toBe(2)
    expect(parseUnpaidExpiryPolicy({ [UNPAID_EXPIRY_SETTINGS_KEY]: { enabled: true, hours: 1000 } }).hours).toBe(168)
  })

  it("mốc huỷ = bây giờ − số giờ", () => {
    const now = new Date("2026-11-08T12:00:00Z")
    expect(unpaidExpiryCutoff({ enabled: true, hours: 24 }, now).toISOString()).toBe("2026-11-07T12:00:00.000Z")
  })
})
