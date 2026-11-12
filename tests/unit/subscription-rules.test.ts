import { describe, expect, it } from "vitest"

import { planChangeKind, prorationVnd, repricedPendingAmount, splitOverpayment } from "@/modules/subscription/domain/plan-change"
import { addCycle, expiringPlanCredit, findInvoiceCode, formatInvoiceCode, reminderDue, renewalOpensAt } from "@/modules/subscription/domain/subscription-rules"

/** Checklist ALG 10.7, PO Q9/Q10 — chu kỳ, mã hoá đơn đối soát, nhắc gia hạn, credit tặng hết hạn cuối tháng. */
describe("vòng đời thuê bao", () => {
  it("cộng kỳ tháng/năm, lùi về cuối tháng ngắn", () => {
    expect(addCycle(new Date("2026-01-31T00:00:00Z"), "MONTHLY").toISOString()).toBe("2026-02-28T00:00:00.000Z")
    expect(addCycle(new Date("2026-11-05T03:00:00Z"), "MONTHLY").toISOString()).toBe("2026-12-05T03:00:00.000Z")
    expect(addCycle(new Date("2028-02-29T00:00:00Z"), "YEARLY").toISOString()).toBe("2029-02-28T00:00:00.000Z")
  })

  it("mã hoá đơn đọc lại được từ nội dung chuyển khoản có khoảng trắng, chữ thường", () => {
    const code = formatInvoiceCode([0, 1, 2, 3, 4, 5, 6, 31])
    expect(code).toBe("TBABCDEFG9")
    expect(() => formatInvoiceCode([0, 1, 2, 3, 4, 5, 6, 32])).toThrow(RangeError)
    expect(findInvoiceCode(`ck thanh toan ${code.slice(0, 5).toLowerCase()} ${code.slice(5)} cam on`)).toBe(code)
    expect(findInvoiceCode("chuyen tien an trua")).toBeNull()
  })

  it("mở hoá đơn gia hạn 7 ngày trước; nhắc 7 ngày và 1 ngày", () => {
    const end = new Date("2026-12-05T00:00:00Z")
    expect(renewalOpensAt(end).toISOString()).toBe("2026-11-28T00:00:00.000Z")
    expect(reminderDue(end, 1, new Date("2026-12-03T23:00:00Z"))).toBe(false)
    expect(reminderDue(end, 1, new Date("2026-12-04T00:00:00Z"))).toBe(true)
  })

  it("credit tặng còn thừa = tặng − đã dùng, không vượt số dư", () => {
    expect(expiringPlanCredit(300, 120, 500)).toBe(180)
    expect(expiringPlanCredit(300, 400, 500)).toBe(0)
    expect(expiringPlanCredit(300, 0, 50)).toBe(50)
  })

  // Audit BL-27, PO 12/11/2026
  it("ngày neo: tháng ngắn lùi về cuối tháng, tháng sau quay lại ngày neo", () => {
    expect(addCycle(new Date("2026-02-28T00:00:00Z"), "MONTHLY", 31).toISOString()).toBe("2026-03-31T00:00:00.000Z")
    expect(addCycle(new Date("2026-03-31T00:00:00Z"), "MONTHLY", 31).toISOString()).toBe("2026-04-30T00:00:00.000Z")
    expect(addCycle(new Date("2026-04-30T00:00:00Z"), "MONTHLY", 31).toISOString()).toBe("2026-05-31T00:00:00.000Z")
  })

  it("đổi gói: nâng cùng chu kỳ áp ngay; hạ gói / đổi chu kỳ áp kỳ sau; bù chênh lệch theo phần còn lại", () => {
    expect(planChangeKind({ priceVnd: 300_000, cycle: "MONTHLY" }, { priceVnd: 600_000, cycle: "MONTHLY" })).toBe("UPGRADE")
    expect(planChangeKind({ priceVnd: 600_000, cycle: "MONTHLY" }, { priceVnd: 300_000, cycle: "MONTHLY" })).toBe("NEXT_PERIOD")
    expect(planChangeKind({ priceVnd: 300_000, cycle: "MONTHLY" }, { priceVnd: 3_000_000, cycle: "YEARLY" })).toBe("NEXT_PERIOD")
    expect(planChangeKind({ priceVnd: 300_000, cycle: "MONTHLY" }, { priceVnd: 300_000, cycle: "MONTHLY" })).toBe("NONE")
    const periodStart = new Date("2026-11-01T00:00:00Z"), periodEnd = new Date("2026-12-01T00:00:00Z")
    expect(prorationVnd({ oldPriceVnd: 300_000, newPriceVnd: 600_000, periodStart, periodEnd, now: new Date("2026-11-16T00:00:00Z") })).toBe(150_000)
    expect(prorationVnd({ oldPriceVnd: 300_000, newPriceVnd: 600_000, periodStart, periodEnd, now: new Date("2026-12-02T00:00:00Z") })).toBe(0)
    expect(prorationVnd({ oldPriceVnd: 600_000, newPriceVnd: 300_000, periodStart, periodEnd, now: new Date("2026-11-16T00:00:00Z") })).toBe(0)
  })

  it("hoá đơn kỳ sau theo giá mới, giữ phần đã trừ tiền dư; tiền dư trừ tối đa bằng hoá đơn", () => {
    expect(repricedPendingAmount(200_000, 300_000, 600_000)).toBe(500_000)
    expect(repricedPendingAmount(50_000, 300_000, 100_000)).toBe(0)
    expect(splitOverpayment(100_000, 300_000)).toEqual({ appliedVnd: 100_000, leftoverVnd: 0 })
    expect(splitOverpayment(500_000, 300_000)).toEqual({ appliedVnd: 300_000, leftoverVnd: 200_000 })
    expect(splitOverpayment(-5, 300_000)).toEqual({ appliedVnd: 0, leftoverVnd: 0 })
  })
})
