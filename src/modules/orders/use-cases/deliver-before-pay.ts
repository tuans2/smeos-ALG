/**
 * "Giao trước, thu sau" theo từng đơn — Đơn hàng đa nguồn P3 (§5). Chỉ đơn ngoài Thẻ chào.
 *  - `requestDeliverBeforePay` (R2): Sale bấm trên đơn. Trong chính sách / hoả tốc / trong hạn mức → tự duyệt,
 *    đơn sang Điều phối ngay. Ngoài → chờ Điều hành.
 *  - `decideDeliverBeforePay` (R16): Điều hành duyệt (sửa hạn thu) hoặc từ chối.
 */

import { conflict, notFound, unprocessable, validationFailed } from "@/core/http/errors"
import { assertNotSelfApproval } from "@/modules/organization/use-cases/assert-not-self-approval"
import type { TenantContext } from "@/core/tenancy"
import { isUrgentOrder } from "@/modules/greeting-card/domain/brochure-workflow-policy"
import { DELIVER_BEFORE_PAY, decideDeliverBeforePay as decide, defaultCollectDueAt } from "../workflow/deliver-before-pay"
import { ApprovalRequestRepository } from "../infra/approval-request-repository"
import { notifyOrganization } from "@/modules/notification/use-cases/notify-organization"

type Repo = Pick<ApprovalRequestRepository, "findOrder" | "orgSettings" | "customerStats" | "hasOpenRequest" | "create" | "findRequest" | "decide" | "list">
const REASON_MAX = 500

function deliveryWindowOf(raw: unknown): { deliveryDate?: string; deliveryTimeSlot?: string } {
  const w = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  return {
    ...(typeof w.date === "string" ? { deliveryDate: w.date } : {}),
    ...(typeof w.timeSlot === "string" ? { deliveryTimeSlot: w.timeSlot } : {}),
  }
}

export async function requestDeliverBeforePay(
  ctx: TenantContext,
  orderId: string,
  input: { reason?: string | undefined },
  repo: Repo = new ApprovalRequestRepository(),
  now = new Date(),
  notify: typeof notifyOrganization = notifyOrganization,
) {
  const reason = input.reason?.trim() ?? ""
  if (!reason || reason.length > REASON_MAX) throw validationFailed({ reason: `Ghi lý do (tối đa ${REASON_MAX} ký tự)` })
  const order = await repo.findOrder(ctx, orderId)
  if (!order) throw notFound()
  if (order.status === "CANCELLED" || order.status === "COMPLETED") throw unprocessable("Đơn đã kết thúc, không cần giao trước")
  if (await repo.hasOpenRequest(ctx, orderId, DELIVER_BEFORE_PAY)) throw conflict("Đơn đã có yêu cầu giao trước, thu sau")

  const [settings, stats] = await Promise.all([repo.orgSettings(ctx), repo.customerStats(ctx, order.customer_id, now)])
  const verdict = decide(settings, {
    totalVnd: Number(order.total_vnd),
    paidVnd: Number(order.paid_vnd),
    isUrgent: isUrgentOrder(deliveryWindowOf(order.delivery_window), now),
    customerCompletedOrders: stats.completedOrders,
    customerHasOverdueDebt: stats.hasOverdueDebt,
    customerOpenDebtVnd: stats.openDebtVnd,
  })
  if (verdict.outcome === "QUOTE_FIRST") throw unprocessable("Đơn chưa có giá — báo giá trước")
  if (verdict.outcome === "ALREADY_PAID") throw unprocessable("Đơn đã thu đủ, không cần giao trước")

  const autoApprove = verdict.outcome === "AUTO_APPROVE"
  const row = await repo.create(
    ctx,
    order,
    {
      orderId,
      kind: DELIVER_BEFORE_PAY,
      status: autoApprove ? "AUTO_APPROVED" : "PENDING",
      basis: autoApprove ? verdict.basis : null,
      reason,
      collectDueAt: defaultCollectDueAt(settings, now),
    },
    autoApprove ? `Giao trước, thu sau — ${verdict.label}. Lý do: ${reason}` : "",
  )
  if (!autoApprove) {
    // Không chờ: thông báo chậm/lỗi không làm hỏng yêu cầu đã ghi
    void notify({
      organizationId: ctx.organizationId,
      eventKey: "ORDER_DELIVER_BEFORE_PAY_REQUESTED",
      ownerUserId: ctx.userId,
      title: `Xin giao trước, thu sau — đơn ${order.code}`,
      message: `${verdict.why}. Lý do: ${reason}`,
      deepLink: "/don-hang?tab=approve",
    })
  }
  return {
    request: { id: row.id, status: row.status, basis: row.basis, collectDueAt: row.collect_due_at?.toISOString() ?? null },
    message: autoApprove ? `Đã chuyển đơn sang Điều phối (${verdict.label})` : `Đã gửi Điều hành duyệt: ${verdict.why}`,
  }
}

export async function decideDeliverBeforePay(
  ctx: TenantContext,
  requestId: string,
  input: { approve?: unknown; note?: unknown; collectDueAt?: unknown },
  repo: Repo = new ApprovalRequestRepository(),
  now = new Date(),
) {
  if (typeof input.approve !== "boolean") throw validationFailed({ approve: "Chọn duyệt hoặc từ chối" })
  const note = typeof input.note === "string" && input.note.trim() ? input.note.trim().slice(0, REASON_MAX) : null
  if (!input.approve && !note) throw validationFailed({ note: "Ghi lý do từ chối" })
  let collectDueAt: Date | null = null
  if (input.collectDueAt !== undefined && input.collectDueAt !== null) {
    collectDueAt = typeof input.collectDueAt === "string" ? new Date(input.collectDueAt) : new Date(NaN)
    if (Number.isNaN(collectDueAt.getTime())) throw validationFailed({ collectDueAt: "Hạn thu không hợp lệ" })
    // Hạn thu ở quá khứ làm đơn quá hạn ngay khi duyệt (audit BL-15)
    if (collectDueAt.getTime() < now.getTime()) throw validationFailed({ collectDueAt: "Hạn thu phải từ bây giờ trở đi" })
  }
  const req = await repo.findRequest(ctx, requestId)
  if (!req || req.kind !== DELIVER_BEFORE_PAY || req.order.source === "BROCHURE") throw notFound()
  if (input.approve) await assertNotSelfApproval(ctx, req.requested_by)
  const ok = await repo.decide(ctx, requestId, req.order, { approve: input.approve, note, collectDueAt },
    `Giao trước, thu sau — Điều hành duyệt${note ? `: ${note}` : ""}. Lý do Sale: ${req.reason}`)
  if (!ok) throw conflict("Yêu cầu đã được xử lý")
  return { status: input.approve ? "APPROVED" : "REJECTED" }
}

export async function listApprovalRequests(
  ctx: TenantContext,
  opts: { status?: string | undefined; limit: number },
  repo: Pick<ApprovalRequestRepository, "list"> = new ApprovalRequestRepository(),
) {
  if (opts.status && !["PENDING", "APPROVED", "REJECTED", "AUTO_APPROVED"].includes(opts.status)) {
    throw validationFailed({ status: "Trạng thái không hợp lệ" })
  }
  const rows = await repo.list(ctx, opts)
  return {
    items: rows.map((r) => ({
      id: r.id, kind: r.kind, status: r.status, basis: r.basis, reason: r.reason,
      requestedBy: r.requested_by, requestedAt: r.requested_at.toISOString(),
      decidedBy: r.decided_by, decidedAt: r.decided_at?.toISOString() ?? null, decisionNote: r.decision_note,
      collectDueAt: r.collect_due_at?.toISOString() ?? null,
      order: { id: r.order.id, code: r.order.code, totalVnd: Number(r.order.total_vnd), paidVnd: Number(r.order.paid_vnd), balanceVnd: Number(r.order.balance_vnd) },
    })),
  }
}
