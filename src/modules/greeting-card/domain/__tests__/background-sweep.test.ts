import { describe, expect, it } from "vitest"
import { AUTO_CANCEL_GRACE_MS, holdAction } from "../background-sweep"

const now = new Date("2026-10-06T10:00:00Z")
const ago = (min: number) => new Date(now.getTime() - min * 60_000)
const order = (over: Partial<Parameters<typeof holdAction>[0]> = {}) => ({
  status: "DRAFT", totalVnd: 500_000, paidVnd: 0, createdAt: ago(20), customerReportedPaid: false, ...over,
})
const policy = { depositPercent: 0, requirePaidBeforeProduction: false, requireFullBeforeDispatch: false, holdMinutes: 15 }

describe("holdAction", () => {
  it("chưa hết hạn giữ hoặc tiệm không bật giữ đơn → không làm gì", () => {
    expect(holdAction(order({ createdAt: ago(5) }), policy, now)).toBe("NONE")
    expect(holdAction(order(), { ...policy, holdMinutes: undefined } as never, now)).toBe("NONE")
  })
  it("hết hạn → nhắc; khách đã báo chuyển → không nhắc", () => {
    expect(holdAction(order(), policy, now)).toBe("REMIND")
    expect(holdAction(order({ customerReportedPaid: true }), policy, now)).toBe("NONE")
  })
  it("tự huỷ chỉ khi tiệm bật, quá hạn + 60 phút, khách chưa báo chuyển", () => {
    const late = ago(15 + AUTO_CANCEL_GRACE_MS / 60_000)
    expect(holdAction(order({ createdAt: late }), policy, now)).toBe("REMIND")
    expect(holdAction(order({ createdAt: late }), { ...policy, autoCancelUnpaid: true }, now)).toBe("CANCEL")
    expect(holdAction(order({ createdAt: late, customerReportedPaid: true }), { ...policy, autoCancelUnpaid: true }, now)).toBe("NONE")
  })
  it("đơn đã thu, đã xác nhận hay chờ báo giá → không đụng", () => {
    expect(holdAction(order({ paidVnd: 1 }), policy, now)).toBe("NONE")
    expect(holdAction(order({ status: "CONFIRMED" }), policy, now)).toBe("NONE")
    expect(holdAction(order({ totalVnd: 0 }), policy, now)).toBe("NONE")
  })
})

describe("holdAction — hạn thanh toán 30 phút (PO 08/10/2026)", () => {
  const timeout = { depositPercent: 0, requirePaidBeforeProduction: false, requireFullBeforeDispatch: false, paymentTimeoutMinutes: 30 }
  it("chưa đủ 30 phút → chưa làm gì", () => {
    expect(holdAction(order({ createdAt: ago(29) }), timeout, now)).toBe("NONE")
  })
  it("đủ 30 phút, chưa nhận tiền, khách chưa bấm 'Tôi đã chuyển khoản' → thanh toán thất bại, huỷ ngay", () => {
    expect(holdAction(order({ createdAt: ago(30) }), timeout, now)).toBe("FAIL_PAYMENT")
  })
  it("khách đã bấm 'Tôi đã chuyển khoản' hoặc đã nhận tiền → không huỷ", () => {
    expect(holdAction(order({ createdAt: ago(45), customerReportedPaid: true }), timeout, now)).toBe("NONE")
    expect(holdAction(order({ createdAt: ago(45), paidVnd: 100_000 }), timeout, now)).toBe("NONE")
  })
  it("hạn thanh toán thắng giữ đơn cũ (không chờ thêm 60 phút)", () => {
    expect(holdAction(order({ createdAt: ago(31) }), { ...timeout, holdMinutes: 120, autoCancelUnpaid: true }, now)).toBe("FAIL_PAYMENT")
  })
})
