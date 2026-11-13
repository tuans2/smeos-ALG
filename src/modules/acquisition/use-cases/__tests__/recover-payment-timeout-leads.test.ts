import { describe, expect, it, vi } from "vitest"

import { AUTO_CANCEL_REASON, PAYMENT_TIMEOUT_REASON } from "@/modules/greeting-card/domain/background-sweep"
import type { CancelledOrderCandidate } from "../../domain/lead-recovery"
import { recoverPaymentTimeoutLeads } from "../recover-payment-timeout-leads"

const candidate = (over: Partial<CancelledOrderCandidate>): CancelledOrderCandidate => ({
  organizationId: "org-1", orderId: "o-1", orderCode: "TC-1", source: "BROCHURE", customerId: null,
  customerName: "Lan", customerPhone: "0901234567", saleId: null, orderCreatedAt: new Date(),
  hasRecoveryLead: false, hasOpenLeadForPhone: false, ...over,
})

describe("bộ quét lead cứu đơn", () => {
  it("chỉ đọc đúng hai lý do huỷ quá hạn của luồng hiện hành, trong 24 giờ gần nhất", async () => {
    const now = new Date("2026-10-31T12:00:00Z")
    const repo = { listCandidates: vi.fn(async () => []), createLead: vi.fn() }
    await recoverPaymentTimeoutLeads(now, repo)
    const [since, reasons] = repo.listCandidates.mock.calls[0] as unknown as [Date, string[]]
    expect(since.toISOString()).toBe("2026-10-30T12:00:00.000Z")
    expect([...reasons].sort()).toEqual([AUTO_CANCEL_REASON, PAYMENT_TIMEOUT_REASON].sort())
  })

  it("tạo lead cho đơn chưa cứu, bỏ qua đơn đã cứu; một đơn lỗi không chặn cả lượt", async () => {
    const repo = {
      listCandidates: vi.fn(async () => [
        candidate({ orderId: "a" }),
        candidate({ orderId: "b", hasRecoveryLead: true }),
        candidate({ orderId: "c" }),
      ]),
      createLead: vi.fn(async (row: { sourceRef: string }) => {
        if (row.sourceRef === "a") throw new Error("db")
      }),
    }
    const r = await recoverPaymentTimeoutLeads(new Date(), repo)
    expect(r).toEqual({ scanned: 3, created: 1, skipped: 2 })
    expect(repo.createLead).toHaveBeenCalledTimes(2)
  })
})
