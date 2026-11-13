import { describe, it, expect, vi } from "vitest"

vi.mock("../../infra/cancellation-follow-up-repository", () => {
  const instance = { listExpiredCoordinatorRejections: vi.fn().mockResolvedValue([]) }
  return {
    CancellationFollowUpRepository: class { listExpiredCoordinatorRejections = instance.listExpiredCoordinatorRejections },
    getCancellationFollowUpRepository: () => instance,
  }
})
vi.mock("../../infra/dismissal-repository", () => {
  const instance = { listExpired: vi.fn().mockResolvedValue([]) }
  return {
    DismissalRepository: class { listExpired = instance.listExpired },
    getDismissalRepository: () => instance,
  }
})
vi.mock("../confirm-brochure-payment", () => ({
  adminConfirmBrochurePayment: vi.fn().mockResolvedValue({ paymentId: "pay-1" }),
}))
vi.mock("../notify-customer", () => ({
  notifyOrderEvent: vi.fn().mockResolvedValue("SENT"),
  queueOrderNotification: vi.fn(),
}))

import { runBackgroundSweep } from "../background-sweep"
import { adminConfirmBrochurePayment } from "../confirm-brochure-payment"
import type { BackgroundSweepRepository } from "../../infra/background-sweep-repository"
import type { BrochurePaymentRepository } from "../../infra/brochure-payment-repository"

const now = new Date("2026-10-14T10:00:00Z")

function sweepRepo(settings: Record<string, unknown>, analysisStatus: string | null, analysisExpectedVnd: number | null = 500_000) {
  return {
    failStaleSending: vi.fn().mockResolvedValue(0),
    listRetryable: vi.fn().mockResolvedValue([]),
    listUnpaidDrafts: vi.fn().mockResolvedValue([]),
    listPendingPaymentProofOrders: vi.fn().mockResolvedValue([
      { id: "order-1", organizationId: "org-1", settings, reportedAt: new Date(now.getTime() - 20 * 60_000), analysisStatus, analysisExpectedVnd },
    ]),
    listPendingSessions: vi.fn().mockResolvedValue([]),
    expireSession: vi.fn(),
  } as unknown as BackgroundSweepRepository
}
const payments = { recordIncomingPayment: vi.fn(), cancel: vi.fn() } as unknown as BrochurePaymentRepository

/**
 * Bill khách tải lên mặc định chờ Điều hành duyệt tay. Vòng quét chỉ tự ghi nhận tiền khi tiệm
 * bật "Tự động duyệt thanh toán khi có ảnh bill" VÀ AI đối soát bill khớp (soát 14/10/2026:
 * trước đây vòng quét bỏ qua công tắc và tự duyệt mọi bill sau 15 phút, kể cả bill sai).
 */
describe("runBackgroundSweep — tự duyệt bill chuyển khoản", () => {
  it("tiệm chưa bật tự duyệt → không ghi nhận tiền dù bill khớp", async () => {
    vi.mocked(adminConfirmBrochurePayment).mockClear()
    const res = await runBackgroundSweep(now, sweepRepo({}, "MATCHED"), payments)
    expect(adminConfirmBrochurePayment).not.toHaveBeenCalled()
    expect(res.autoConfirmed).toBe(0)
  })

  it("tiệm bật nhưng bill lệch số tiền / sai tài khoản → chờ duyệt tay", async () => {
    vi.mocked(adminConfirmBrochurePayment).mockClear()
    const on = { brochure_policy: { auto_approve_payment_with_proof: true, auto_approve_payment_with_proof_minutes: 15 } }
    await runBackgroundSweep(now, sweepRepo(on, "AMOUNT_MISMATCH"), payments)
    await runBackgroundSweep(now, sweepRepo(on, null), payments)
    expect(adminConfirmBrochurePayment).not.toHaveBeenCalled()
  })

  it("tiệm bật, bill khớp, đã quá số phút tiệm chọn → tự ghi nhận", async () => {
    vi.mocked(adminConfirmBrochurePayment).mockClear()
    const on = { brochure_policy: { auto_approve_payment_with_proof: true, auto_approve_payment_with_proof_minutes: 15 } }
    const res = await runBackgroundSweep(now, sweepRepo(on, "MATCHED"), payments)
    expect(adminConfirmBrochurePayment).toHaveBeenCalledTimes(1)
    // Gửi kèm số tiền AI đã đối chiếu — tổng đơn đổi sau đó (VAT, phụ phí...) thì không tự ghi thu
    expect(vi.mocked(adminConfirmBrochurePayment).mock.calls[0]?.[2]).toMatchObject({ expectedAmountVnd: 500_000 })
    expect(res.autoConfirmed).toBe(1)
  })

  it("bill cũ chưa lưu số tiền đối chiếu → không tự ghi nhận", async () => {
    vi.mocked(adminConfirmBrochurePayment).mockClear()
    const on = { brochure_policy: { auto_approve_payment_with_proof: true, auto_approve_payment_with_proof_minutes: 15 } }
    await runBackgroundSweep(now, sweepRepo(on, "MATCHED", null), payments)
    expect(adminConfirmBrochurePayment).not.toHaveBeenCalled()
  })
})
