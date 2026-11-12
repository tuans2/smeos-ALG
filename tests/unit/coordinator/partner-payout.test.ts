import { describe, expect, it } from "vitest"

import { nextSettlementStatus, periodsOverlap, referencePayoutVnd, resolveClosurePayout, settlementRange, summarizeStatement } from "@/modules/coordinator/domain/partner-payout"
import { craftFeePayableOf, orderReferencePayoutVnd } from "@/modules/coordinator/use-cases/partner-payout-source"

/**
 * Audit BL-22, PO 12/11/2026: ba định nghĩa "tiền công đối tác" (nhập tay lúc đóng đơn, phí gia công + khấu trừ, biểu phí
 * cứng ngành hoa) → một nguồn; đóng đơn để trống ô tiền công từng xoá luôn số đã thoả thuận.
 */
describe("tiền công đối tác — một nguồn", () => {
  it("số chuẩn: phí gia công còn trả (sau khấu trừ) trước, không có thì số thoả thuận", () => {
    const craft = { subcontract_dispatch: { craftFee: { finalVnd: 200_000, deductions: [{ amountVnd: 20_000 }, { amountVnd: 30_000 }] } } }
    expect(craftFeePayableOf(craft)).toBe(150_000)
    expect(craftFeePayableOf({})).toBeNull()
    expect(orderReferencePayoutVnd({ coordination: { metadata: craft, partner_payout_vnd: 999 } })).toBe(150_000)
    expect(orderReferencePayoutVnd({ coordination: { metadata: {}, partner_payout_vnd: "350000" } })).toBe(350_000)
    expect(referencePayoutVnd({ craftFeePayableVnd: null, agreedVnd: null })).toBeNull()
  })

  it("đóng đơn: để trống → giữ số chuẩn; sửa khác số chuẩn phải ghi lý do", () => {
    expect(resolveClosurePayout({ referenceVnd: 150_000, inputVnd: undefined, reason: undefined })).toEqual({ payoutVnd: 150_000, overrideReason: null })
    expect(resolveClosurePayout({ referenceVnd: 150_000, inputVnd: 150_000, reason: undefined })).toEqual({ payoutVnd: 150_000, overrideReason: null })
    expect(resolveClosurePayout({ referenceVnd: 150_000, inputVnd: 180_000, reason: "  " })).toContain("ghi lý do")
    expect(resolveClosurePayout({ referenceVnd: 150_000, inputVnd: 180_000, reason: "Làm thêm phụ kiện" })).toEqual({ payoutVnd: 180_000, overrideReason: "Làm thêm phụ kiện" })
    expect(resolveClosurePayout({ referenceVnd: null, inputVnd: 90_000, reason: undefined })).toEqual({ payoutVnd: 90_000, overrideReason: null })
  })

  it("bảng kê: tổng tiền công và số đơn chưa ghi tiền công", () => {
    const line = (payoutVnd: number | null) => ({ orderId: "o", code: "DH", closedAt: "2026-11-12T00:00:00.000Z", payoutVnd })
    expect(summarizeStatement([line(100_000), line(null), line(50_000)])).toEqual({ orderCount: 3, totalPayoutVnd: 150_000, missingPayoutCount: 1 })
  })

  it("kỳ theo giờ Việt Nam, gồm hai đầu, tối đa 92 ngày; kỳ trùng nhau", () => {
    const r = settlementRange("2026-11-01", "2026-11-30")
    expect(typeof r === "string" ? r : [r.start.toISOString(), r.endExclusive.toISOString()]).toEqual(["2026-10-31T17:00:00.000Z", "2026-11-30T17:00:00.000Z"])
    expect(settlementRange("2026-11-30", "2026-11-01")).toBeTypeOf("string")
    expect(settlementRange("2026-01-01", "2026-12-31")).toBeTypeOf("string")
    expect(settlementRange("01/11/2026", "2026-11-30")).toBeTypeOf("string")
    expect(periodsOverlap({ from: "2026-11-01", to: "2026-11-15" }, { from: "2026-11-15", to: "2026-11-30" })).toBe(true)
    expect(periodsOverlap({ from: "2026-11-01", to: "2026-11-14" }, { from: "2026-11-15", to: "2026-11-30" })).toBe(false)
  })

  it("sổ quyết toán đi đúng thứ tự Chờ đối soát → Đã đối soát → Đã thanh toán", () => {
    expect(nextSettlementStatus("PENDING", "RECONCILE")).toBe("RECONCILED")
    expect(nextSettlementStatus("RECONCILED", "PAY")).toBe("PAID")
    expect(nextSettlementStatus("PENDING", "PAY")).toContain("đối soát")
    expect(nextSettlementStatus("PAID", "RECONCILE")).toContain("chờ đối soát")
  })
})
