import { describe, it, expect } from "vitest"
import { customerVisiblePaidVnd, isDepositPendingApproval } from "../deposit-acknowledgement"

const base = { status: "CONFIRMED", productionStatus: "ASSIGNED", totalVnd: 468_000, paidVnd: 0, customerReported: true }

describe("isDepositPendingApproval — Điều phối tiếp nhận, Điều hành chưa ghi sổ", () => {
  it("đúng khi đơn đã tiếp nhận, khách đã gửi bill, sổ thu 0 đ", () => {
    expect(isDepositPendingApproval(base)).toBe(true)
  })
  it("sai khi khách chưa báo chuyển khoản", () => {
    expect(isDepositPendingApproval({ ...base, customerReported: false })).toBe(false)
  })
  it("sai khi đơn chưa được tiếp nhận (còn DRAFT, chưa vào xưởng)", () => {
    expect(isDepositPendingApproval({ ...base, status: "DRAFT", productionStatus: "WAITING" })).toBe(false)
  })
  it("sai khi đã ghi sổ thu hoặc đơn đã huỷ", () => {
    expect(isDepositPendingApproval({ ...base, paidVnd: 234_000 })).toBe(false)
    expect(isDepositPendingApproval({ ...base, status: "CANCELLED" })).toBe(false)
  })
})

describe("customerVisiblePaidVnd — khách thấy đã nhận khoản Lần 1", () => {
  it("cọc 50% của tiệm → 234.000đ", () => {
    expect(customerVisiblePaidVnd({ ...base, pricingRuleRef: null }, 50)).toBe(234_000)
  })
  it("tiệm không cọc (trả đủ) → toàn bộ giá trị đơn", () => {
    expect(customerVisiblePaidVnd({ ...base, pricingRuleRef: null }, 0)).toBe(468_000)
  })
  it("không ở trạng thái chờ duyệt → giữ đúng sổ thu", () => {
    expect(customerVisiblePaidVnd({ ...base, customerReported: false, pricingRuleRef: null }, 50)).toBe(0)
  })
})
