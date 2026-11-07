import { randomUUID } from "node:crypto"
import type { order_status, Prisma } from "@/generated/prisma/client"
import { conflict } from "@/core/http/errors"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"
import { canProposeDismissal, type DismissalInfo } from "../domain/dismissal-policy"
import { getVoucherRedemptionRepository } from "@/modules/promotions/infra/voucher-redemption-repository"
import { returnStock } from "@/modules/orders/infra/order-stock"

type Tx = Prisma.TransactionClient
type Loose = Record<string, unknown>
export const obj = (v: unknown): Loose => (v && typeof v === "object" && !Array.isArray(v) ? (v as Loose) : {})
const json = (v: unknown) => v as Prisma.InputJsonValue

/** Ảnh chụp đơn đủ để kiểm và khoá lạc quan (trạng thái + số đã thu không đổi giữa lúc đọc và lúc ghi). */
export interface OrderRow { id: string; status: order_status; paid_vnd: unknown; production_status: string | null; pricing_rule_ref: unknown }
export interface SessionRow { id: string; revoked_at: Date | null; expires_at: Date | null; status: string; product_snapshot: unknown }

export function orderDismissible(o: OrderRow) {
  return canProposeDismissal({
    isCancelled: o.status === "CANCELLED",
    paidVnd: Number(o.paid_vnd || 0),
    currentStepId: o.production_status && o.production_status !== "WAITING" ? "STEP_6_ARRANGING" : "STEP_3_FILLING_FORM",
  })
}

export function sessionDismissible(s: SessionRow, now: Date) {
  return canProposeDismissal({
    isCancelled: s.revoked_at !== null || (s.expires_at !== null && s.expires_at <= now),
    paidVnd: 0,
    currentStepId: s.status === "SELECTED" ? "STEP_2_CHOOSING" : "STEP_1_OPENED",
  })
}

/**
 * Ghi đề xuất/quyết định lên đơn. Khi duyệt: huỷ đơn CHỈ nếu đơn vẫn y như lúc kiểm (chưa thu đồng
 * nào, chưa đổi trạng thái) — khách vừa chuyển khoản thì từ chối, không huỷ nhầm đơn đã trả tiền.
 * Lưu trạng thái cũ để Khôi phục trả về đúng chỗ; ghi lịch sử đơn như mọi lần huỷ khác.
 */
export async function writeOrderDismissal(tx: Tx, ctx: TenantContext, order: OrderRow, info: DismissalInfo, now: Date) {
  const approve = info.status === "APPROVED"
  if (approve) {
    const check = orderDismissible(order)
    if (!check.allowed) throw conflict(check.reason ?? "Không thể hủy đơn này.")
  }
  const ref = obj(order.pricing_rule_ref)
  const stored: DismissalInfo & { previousStatus?: string } = approve ? { ...info, previousStatus: order.status } : info
  const moved = await tx.orders.updateMany({
    where: scopedWhere(ctx, { id: order.id, status: order.status, ...(approve ? { paid_vnd: 0 } : {}) }),
    data: { ...(approve ? { status: "CANCELLED" as order_status } : {}), pricing_rule_ref: json({ ...ref, dismissal: stored }) },
  })
  if (moved.count === 0) throw conflict("Đơn hàng vừa thay đổi (có thể khách vừa thanh toán), vui lòng tải lại")
  if (!approve) return
  await getVoucherRedemptionRepository(tx).releaseForOrder(ctx.organizationId, order.id)
  await returnStock(ctx.organizationId, order.id, tx) // hoàn tồn đã trừ lúc đặt; khôi phục thì trừ lại
  await tx.greeting_sessions.updateMany({
    where: scopedWhere(ctx, { order_id: order.id, revoked_at: null }),
    data: { revoked_at: now, revoked_by: ctx.userId },
  })
  await tx.order_events.create({
    data: scopedData(ctx, {
      id: randomUUID(), order_id: order.id, axis: "order", from_value: order.status, to_value: "CANCELLED", actor_id: ctx.userId,
      reason: `${info.autoDismissed ? "Hệ thống tự duyệt" : "Đã duyệt"} bỏ hiển thị đơn: ${info.reason}`,
    }),
  })
}

/** Như trên cho link chưa thành đơn: chỉ thu hồi link còn hiệu lực. */
export async function writeSessionDismissal(tx: Tx, ctx: TenantContext, session: SessionRow, info: DismissalInfo, now: Date) {
  const approve = info.status === "APPROVED"
  if (approve) {
    const check = sessionDismissible(session, now)
    if (!check.allowed) throw conflict(check.reason ?? "Không thể hủy link này.")
  }
  const snapshot = obj(session.product_snapshot)
  const moved = await tx.greeting_sessions.updateMany({
    where: scopedWhere(ctx, { id: session.id, revoked_at: null, order_id: null }),
    data: {
      ...(approve ? { revoked_at: now, revoked_by: ctx.userId, expires_at: now } : {}),
      product_snapshot: json({ ...snapshot, _dismissal: info }),
    },
  })
  if (moved.count === 0) throw conflict("Link vừa thay đổi (có thể khách vừa đặt đơn), vui lòng tải lại")
  await tx.greeting_journey_events.create({
    data: scopedData(ctx, {
      id: randomUUID(), session_id: session.id,
      event_type: info.status === "PENDING" ? "DISMISS_PROPOSED" : approve ? "DISMISSED" : "DISMISS_REJECTED",
      metadata: json(info),
    }),
  })
}
