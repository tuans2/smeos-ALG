/**
 * `GET /api/v1/orders/workbench` (R1) — đơn ngoài Thẻ chào cần Sale/Điều hành xử lý (P4): chờ báo giá, chờ thu,
 * chờ duyệt giao trước, đã giao còn nợ. Phạm vi sale theo cài đặt "chỉ khách của mình" (`resolveSaleScope`).
 */

import type { TenantContext } from "@/core/tenancy"
import { resolveSaleScope } from "@/modules/greeting-card/use-cases/order-scope"
import { orderSourceLabel } from "../domain/order-source"
import { WorkbenchRepository } from "../infra/workbench-repository"

export type WorkbenchStage = "NEEDS_QUOTE" | "AWAITING_PAYMENT" | "AWAITING_APPROVAL" | "IN_COORDINATION" | "DELIVERED_UNPAID"

export function workbenchStage(o: { totalVnd: number; inCoordination: boolean; deliveryStatus: string; requestStatus: string | null }): WorkbenchStage {
  if (o.deliveryStatus === "DELIVERED") return "DELIVERED_UNPAID"
  if (o.inCoordination) return "IN_COORDINATION"
  if (o.totalVnd <= 0) return "NEEDS_QUOTE"
  if (o.requestStatus === "PENDING") return "AWAITING_APPROVAL"
  return "AWAITING_PAYMENT"
}

export async function listWorkbench(
  ctx: TenantContext,
  deps: { repo: Pick<WorkbenchRepository, "list">; saleScope: (ctx: TenantContext) => Promise<string | null> } = { repo: new WorkbenchRepository(), saleScope: resolveSaleScope },
  now = new Date(),
) {
  const rows = await deps.repo.list(ctx, await deps.saleScope(ctx))
  return {
    items: rows.map((r) => {
      const req = r.approval_requests[0] ?? null
      const address = (r.delivery_address ?? {}) as { recipientName?: string; phone?: string }
      const totalVnd = Number(r.total_vnd)
      return {
        id: r.id,
        code: r.code,
        sourceLabel: orderSourceLabel(r.source),
        status: r.status,
        totalVnd,
        paidVnd: Number(r.paid_vnd),
        balanceVnd: Number(r.balance_vnd),
        recipientName: address.recipientName ?? null,
        phone: address.phone ?? null,
        createdAt: r.created_at.toISOString(),
        stage: workbenchStage({ totalVnd, inCoordination: Boolean(r.coordination), deliveryStatus: r.delivery_status, requestStatus: req?.status ?? null }),
        request: req ? { id: req.id, status: req.status, basis: req.basis, collectDueAt: req.collect_due_at?.toISOString() ?? null } : null,
        collectOverdue: Boolean(req?.collect_due_at && req.collect_due_at < now && Number(r.balance_vnd) > 0),
      }
    }),
  }
}
