import { describe, it, expect } from "vitest"
import { firstPaymentAmountVnd } from "../payment-plan"

/** Số tiền cọc Điều phối thấy phải khớp số máy chủ ghi sổ (trước đây giao diện luôn hiện 50%). */
describe("firstPaymentAmountVnd", () => {
  it("dùng tỷ lệ cọc của tiệm khi đơn không có kế hoạch riêng", () => {
    expect(firstPaymentAmountVnd(1_000_000, null, 30)).toBe(300_000)
  })

  it("kế hoạch thanh toán của đơn (mã DC50) thắng tỷ lệ của tiệm", () => {
    const ref = { paymentPlan: { policy: "DEPOSIT_50", depositPercent: 50, source: "PAYMENT_CODE", paymentCode: "DC50" } }
    expect(firstPaymentAmountVnd(1_000_000, ref, 30)).toBe(500_000)
  })

  it("không cọc → thu toàn bộ", () => {
    expect(firstPaymentAmountVnd(1_000_000, null, 0)).toBe(1_000_000)
  })
})
