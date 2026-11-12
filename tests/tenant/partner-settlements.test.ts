import { afterAll, beforeEach, describe, expect, it } from "vitest"

import type { TenantContext } from "@/core/tenancy/tenant-context"
import { advancePartnerSettlement, createPartnerSettlement, getPartnerStatement } from "@/modules/coordinator/use-cases/partner-settlements"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * Audit BL-22, PO 12/11/2026: "Sổ đối soát" đối tác chạy bằng dữ liệu mẫu, nút "Đã thanh toán" chỉ đổi state trình duyệt.
 * Nay: bảng kê đọc đơn đối tác đã đóng trong kỳ; sổ quyết toán lưu thật, đi đúng thứ tự; tổ chức khác → 404.
 */
describe("bảng kê và sổ quyết toán đối tác", () => {
  let a: Tenant
  let b: Tenant
  const can = (t: Tenant): TenantContext => ({ ...t.ctx, capabilities: new Set(["R19"]) })
  let seq = 0

  async function partnerOf(t: Tenant) {
    return prisma.partners.create({ data: { organization_id: t.organizationId, code: `XU-${++seq}`, name: `Xưởng ${seq}`, phone: "0901 234 567" } })
  }
  async function closedOrder(t: Tenant, partnerId: string, closedAt: string, payout: number | null) {
    const order = await prisma.orders.create({
      data: { organization_id: t.organizationId, code: `QT-${++seq}`, status: "COMPLETED", total_vnd: 500_000, paid_vnd: 500_000, balance_vnd: 0, created_by: t.userId },
    })
    await prisma.order_coordinations.create({
      data: { organization_id: t.organizationId, order_id: order.id, partner_id: partnerId, stage: "COMPLETED", closed_at: new Date(closedAt), partner_payout_vnd: payout },
    })
  }
  const NOV = { from: "2026-11-01", to: "2026-11-30" }

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("qt-a")
    b = await createTenant("qt-b")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("bảng kê theo kỳ giờ Việt Nam; thiếu R19 → từ chối; đối tác tổ chức khác → 404", async () => {
    const p = await partnerOf(a)
    await closedOrder(a, p.id, "2026-11-05T03:00:00Z", 150_000)
    await closedOrder(a, p.id, "2026-10-31T17:30:00Z", 100_000) // 00:30 ngày 01/11 giờ Việt Nam
    await closedOrder(a, p.id, "2026-12-01T01:00:00Z", 999_000) // ngoài kỳ
    const st = await getPartnerStatement(can(a), p.id, NOV)
    expect(st).toMatchObject({ orderCount: 2, totalPayoutVnd: 250_000, missingPayoutCount: 0 })
    await expect(getPartnerStatement(a.ctx, p.id, NOV)).rejects.toMatchObject({ code: "CAPABILITY_DENIED" })
    await expect(getPartnerStatement(can(b), p.id, NOV)).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("lập sổ: chụp bảng kê; kỳ trùng → 409; đơn thiếu tiền công → 422; đúng thứ tự đối soát → thanh toán", async () => {
    const p = await partnerOf(a)
    await closedOrder(a, p.id, "2026-11-05T03:00:00Z", 150_000)
    const s = await createPartnerSettlement(can(a), p.id, NOV)
    expect(s).toMatchObject({ status: "PENDING", orderCount: 1, totalPayoutVnd: 150_000, from: "2026-11-01", to: "2026-11-30" })
    await expect(createPartnerSettlement(can(a), p.id, { from: "2026-11-20", to: "2026-12-05" })).rejects.toMatchObject({ code: "CONFLICT" })

    await closedOrder(a, p.id, "2026-12-03T03:00:00Z", null)
    await expect(createPartnerSettlement(can(a), p.id, { from: "2026-12-01", to: "2026-12-31" })).rejects.toMatchObject({ code: "UNPROCESSABLE_ENTITY" })

    await expect(advancePartnerSettlement(can(a), s.id, "PAY")).rejects.toMatchObject({ code: "UNPROCESSABLE_ENTITY" })
    await expect(advancePartnerSettlement(can(b), s.id, "RECONCILE")).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect((await advancePartnerSettlement(can(a), s.id, "RECONCILE")).status).toBe("RECONCILED")
    expect(await advancePartnerSettlement(can(a), s.id, "PAY", { paymentReference: "PC-0012" })).toMatchObject({ status: "PAID", paymentReference: "PC-0012" })
    expect(await prisma.audit_logs.count({ where: { organization_id: a.organizationId, action: { startsWith: "coordinator.partner_settlement" } } })).toBe(3)
  })
})
