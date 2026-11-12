/**
 * Bảng kê và sổ quyết toán tiền công đối tác (PO 12/11/2026, audit BL-22). Bảng kê chỉ đọc: đơn đối tác đã đóng trong
 * kỳ với tiền công ghi lúc đóng (một nguồn — `partner-payout.ts`). Sổ quyết toán chụp bảng kê của một kỳ, rồi
 * Chờ đối soát → Đã đối soát → Đã thanh toán. Thay màn "Sổ đối soát" chạy bằng dữ liệu mẫu. Mã năng lực R19 (sổ thu,
 * đối soát — mặc định Điều hành, Kế toán). Đối tác / sổ của tổ chức khác → 404.
 */
import { AppError, conflict, notFound, unprocessable } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { nextSettlementStatus, settlementRange, summarizeStatement, type SettlementAction } from "../domain/partner-payout"
import { PartnerSettlementRepository, type SettlementRow } from "../infra/partner-settlement-repository"
import { runInTransaction } from "../infra/transaction"

export const SETTLEMENT_CAPABILITY = "R19"

const day = (d: Date) => d.toISOString().slice(0, 10)

export function settlementView(s: SettlementRow) {
  return {
    id: s.id, partnerId: s.partner_id, from: day(s.period_from), to: day(s.period_to), status: s.status,
    orderCount: s.order_count, totalPayoutVnd: Number(s.total_payout_vnd), note: s.note,
    createdAt: s.created_at.toISOString(), reconciledAt: s.reconciled_at?.toISOString() ?? null,
    paidAt: s.paid_at?.toISOString() ?? null, paymentReference: s.payment_reference,
  }
}

function rangeOrThrow(from: string, to: string) {
  const range = settlementRange(from, to)
  if (typeof range === "string") throw new AppError("VALIDATION_FAILED", range)
  return range
}

export async function getPartnerStatement(ctx: TenantContext, partnerId: string, q: { from: string; to: string }, repo = new PartnerSettlementRepository()) {
  requireCapability(ctx, SETTLEMENT_CAPABILITY)
  const partner = await repo.findPartner(ctx, partnerId)
  if (!partner) throw notFound()
  const range = rangeOrThrow(q.from, q.to)
  const [lines, settlements] = await Promise.all([repo.closedOrders(ctx, partnerId, range.start, range.endExclusive), repo.list(ctx, partnerId)])
  return { partner, period: { from: q.from, to: q.to }, ...summarizeStatement(lines), lines, settlements: settlements.map(settlementView) }
}

export async function createPartnerSettlement(ctx: TenantContext, partnerId: string, input: { from: string; to: string; note?: string | undefined }) {
  requireCapability(ctx, SETTLEMENT_CAPABILITY)
  const range = rangeOrThrow(input.from, input.to)
  const created = await runInTransaction(async (tx) => {
    const repo = new PartnerSettlementRepository(tx)
    if (!(await repo.findPartner(ctx, partnerId))) throw notFound()
    const from = new Date(`${input.from}T00:00:00Z`), to = new Date(`${input.to}T00:00:00Z`)
    if (await repo.findOverlapping(ctx, partnerId, from, to)) throw conflict("Kỳ này trùng với một sổ quyết toán đã lập của đối tác")
    const lines = await repo.closedOrders(ctx, partnerId, range.start, range.endExclusive)
    const sum = summarizeStatement(lines)
    if (sum.orderCount === 0) throw unprocessable("Kỳ này đối tác chưa có đơn đã đóng")
    if (sum.missingPayoutCount > 0) throw unprocessable(`Còn ${sum.missingPayoutCount} đơn chưa ghi tiền công — bổ sung trước khi lập sổ`)
    const row = await repo.create(ctx, { partnerId, from, to, lines, totalVnd: sum.totalPayoutVnd, note: input.note?.trim() || null })
    await recordAuditLog(ctx, { action: "coordinator.partner_settlement.create", entityType: "partner_settlements", entityId: row.id, after: { partnerId, from: input.from, to: input.to, orderCount: sum.orderCount, totalVnd: sum.totalPayoutVnd } }, tx)
    return row
  })
  return settlementView(created)
}

export async function advancePartnerSettlement(ctx: TenantContext, id: string, action: SettlementAction, input: { paymentReference?: string | undefined } = {}) {
  requireCapability(ctx, SETTLEMENT_CAPABILITY)
  const now = new Date()
  const row = await runInTransaction(async (tx) => {
    const repo = new PartnerSettlementRepository(tx)
    const current = await repo.find(ctx, id)
    if (!current) throw notFound()
    const next = nextSettlementStatus(current.status, action)
    if (!(next === "RECONCILED" || next === "PAID")) throw unprocessable(next)
    const data = next === "RECONCILED"
      ? { status: next, reconciled_by: ctx.userId, reconciled_at: now }
      : { status: next, paid_by: ctx.userId, paid_at: now, payment_reference: input.paymentReference?.trim() || null }
    if (!(await repo.advance(ctx, id, current.status, data))) throw conflict("Sổ vừa được người khác cập nhật — tải lại")
    await recordAuditLog(ctx, { action: `coordinator.partner_settlement.${action === "RECONCILE" ? "reconcile" : "pay"}`, entityType: "partner_settlements", entityId: id, before: { status: current.status }, after: { status: next } }, tx)
    return (await repo.find(ctx, id))!
  })
  return settlementView(row)
}
