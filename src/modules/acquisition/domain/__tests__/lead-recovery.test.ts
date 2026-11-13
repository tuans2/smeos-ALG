import { describe, expect, it } from "vitest"

import { planRecoveryLead, RECOVERY_CONSENT_VERSION, type CancelledOrderCandidate } from "../lead-recovery"

const base: CancelledOrderCandidate = {
  organizationId: "org-1",
  orderId: "o-1",
  orderCode: "TC-001",
  source: "BROCHURE",
  customerId: "c-1",
  customerName: "Lan",
  customerPhone: "0901234567",
  saleId: "sale-1",
  orderCreatedAt: new Date("2026-10-31T01:00:00Z"),
  hasRecoveryLead: false,
  hasOpenLeadForPhone: false,
}

describe("đơn quá hạn thanh toán → lead cứu đơn", () => {
  it("tạo lead cho đúng tổ chức, giao lại cho sale cũ, ghi lý do và nguồn đơn", () => {
    const plan = planRecoveryLead(base)
    expect(plan.action).toBe("CREATE")
    if (plan.action !== "CREATE") return
    expect(plan.row).toMatchObject({
      organizationId: "org-1",
      phone: "0901234567",
      source: "BROCHURE",
      sourceRef: "o-1",
      assigneeUserId: "sale-1",
      reason: "PAYMENT_TIMEOUT",
      consentVersion: RECOVERY_CONSENT_VERSION,
    })
    expect(plan.row.message).toContain("TC-001")
  })

  it("chạy lặp an toàn: đơn đã có lead cứu đơn thì bỏ qua", () => {
    expect(planRecoveryLead({ ...base, hasRecoveryLead: true })).toEqual({ action: "SKIP", why: "ALREADY_RECOVERED" })
  })

  it("một SĐT chỉ một lead đang mở", () => {
    expect(planRecoveryLead({ ...base, hasOpenLeadForPhone: true })).toEqual({ action: "SKIP", why: "OPEN_LEAD_EXISTS" })
  })

  it("không có SĐT thì không tạo lead", () => {
    expect(planRecoveryLead({ ...base, customerPhone: "  " })).toEqual({ action: "SKIP", why: "NO_PHONE" })
  })
})
