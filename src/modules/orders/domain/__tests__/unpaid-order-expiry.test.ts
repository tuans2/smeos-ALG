import { describe, expect, it } from "vitest"

import { hasLikelyUnmatchedPayment, parseUnpaidExpiryPolicy, stockHoldCutoff, unpaidExpiryCutoff, UNPAID_EXPIRY_SETTINGS_KEY } from "../unpaid-order-expiry"

describe("chính sách tự huỷ đơn chưa thanh toán (UJ-12)", () => {
  it("mặc định tắt, 24 giờ", () => {
    expect(parseUnpaidExpiryPolicy(null)).toMatchObject({ enabled: false, hours: 24 })
    expect(parseUnpaidExpiryPolicy({ [UNPAID_EXPIRY_SETTINGS_KEY]: { enabled: "true" } })).toMatchObject({ enabled: false, hours: 24 })
  })

  it("bật với số giờ hợp lệ, kẹp trong 2–168 giờ", () => {
    expect(parseUnpaidExpiryPolicy({ [UNPAID_EXPIRY_SETTINGS_KEY]: { enabled: true, hours: 6 } })).toMatchObject({ enabled: true, hours: 6 })
    expect(parseUnpaidExpiryPolicy({ [UNPAID_EXPIRY_SETTINGS_KEY]: { enabled: true, hours: 0 } }).hours).toBe(2)
    expect(parseUnpaidExpiryPolicy({ [UNPAID_EXPIRY_SETTINGS_KEY]: { enabled: true, hours: 1000 } }).hours).toBe(168)
  })

  it("mốc huỷ = bây giờ − số giờ", () => {
    const now = new Date("2026-11-08T12:00:00Z")
    expect(unpaidExpiryCutoff({ hours: 24 }, now).toISOString()).toBe("2026-11-07T12:00:00.000Z")
  })

  // PO 12/11/2026 (audit BL-26): đơn đang giữ tồn tự huỷ riêng, mặc định bật, 2 giờ (2–24)
  it("đơn giữ tồn: mặc định bật 2 giờ; tiệm tắt được, chỉnh 2–24 giờ", () => {
    expect(parseUnpaidExpiryPolicy(null)).toMatchObject({ stockHoldEnabled: true, stockHoldHours: 2 })
    expect(parseUnpaidExpiryPolicy({ [UNPAID_EXPIRY_SETTINGS_KEY]: { stockHoldEnabled: false } }).stockHoldEnabled).toBe(false)
    expect(parseUnpaidExpiryPolicy({ [UNPAID_EXPIRY_SETTINGS_KEY]: { stockHoldHours: 100 } }).stockHoldHours).toBe(24)
    const now = new Date("2026-11-12T12:00:00Z")
    expect(stockHoldCutoff(parseUnpaidExpiryPolicy(null), now)?.toISOString()).toBe("2026-11-12T10:00:00.000Z")
    expect(stockHoldCutoff(parseUnpaidExpiryPolicy({ [UNPAID_EXPIRY_SETTINGS_KEY]: { stockHoldEnabled: false } }), now)).toBeNull()
  })

  it("có chuyển khoản chưa khớp đúng số tiền, đến sau lúc đặt → coi như khách có thể đã trả", () => {
    const order = { totalVnd: 500_000, createdAt: new Date("2026-11-12T08:00:00Z") }
    expect(hasLikelyUnmatchedPayment(order, [{ amountVnd: 500_000, at: new Date("2026-11-12T08:30:00Z") }])).toBe(true)
    expect(hasLikelyUnmatchedPayment(order, [{ amountVnd: 450_000, at: new Date("2026-11-12T08:30:00Z") }])).toBe(false)
    expect(hasLikelyUnmatchedPayment(order, [{ amountVnd: 500_000, at: new Date("2026-11-12T07:00:00Z") }])).toBe(false)
  })
})
