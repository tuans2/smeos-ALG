import { randomUUID } from "node:crypto"
import type { order_status, Prisma } from "@/generated/prisma/client"
import { conflict, notFound } from "@/core/http/errors"
import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { obj } from "./dismissal-store"
import { retakeStock } from "@/modules/orders/infra/order-stock"

const json = (v: unknown) => v as Prisma.InputJsonValue
const RESTORE_DAYS_MS = 7 * 86_400_000
const ONLY_DISMISSED = "Chỉ khôi phục được đơn/link đã bỏ hiển thị. Đơn huỷ theo quy trình huỷ/hoàn tiền không khôi phục ở đây."

/**
 * Khôi phục đơn/link đã BỎ HIỂN THỊ (không phải mọi đơn huỷ): đơn quay về đúng trạng thái trước khi
 * bỏ, link được mở lại 7 ngày. Lịch sử bỏ hiển thị giữ trong `dismissalHistory`, có lịch sử đơn + audit.
 */
export class DismissalRestoreRepository {
  constructor(private readonly db = prisma) {}

  async restore(ctx: TenantContext, input: { id: string; type: "ORDER" | "SESSION"; reason?: string }): Promise<void> {
    const now = new Date()
    const reason = input.reason?.trim() || "Khôi phục lại tiến độ theo yêu cầu"
    const stamp = { restoredBy: ctx.userId, restoredAt: now.toISOString(), restoreReason: reason }

    if (input.type === "SESSION") {
      const s = await this.db.greeting_sessions.findFirst({
        where: scopedWhere(ctx, { id: input.id }),
        select: { id: true, revoked_at: true, product_snapshot: true },
      })
      if (!s) throw notFound()
      const snap = obj(s.product_snapshot)
      const d = obj(snap._dismissal)
      if (d.status !== "APPROVED") throw conflict(ONLY_DISMISSED)
      const history = Array.isArray(snap._dismissalHistory) ? snap._dismissalHistory : []
      await this.db.$transaction(async (tx) => {
        const moved = await tx.greeting_sessions.updateMany({
          where: scopedWhere(ctx, { id: s.id, order_id: null }),
          data: {
            revoked_at: null, revoked_by: null, expires_at: new Date(now.getTime() + RESTORE_DAYS_MS),
            product_snapshot: json({ ...snap, _dismissal: null, _dismissalHistory: [...history, { ...d, ...stamp }] }),
          },
        })
        if (moved.count === 0) throw conflict("Link vừa thay đổi, vui lòng tải lại")
        await tx.greeting_journey_events.create({
          data: scopedData(ctx, { id: randomUUID(), session_id: s.id, event_type: "RESTORED", metadata: json(stamp) }),
        })
        await recordAuditLog(ctx, {
          action: "session.restore", entityType: "greeting_session", entityId: s.id,
          before: { revoked_at: s.revoked_at, dismissal: d }, after: { revoked_at: null, ...stamp },
        }, tx)
      })
      return
    }

    const order = await this.db.orders.findFirst({
      where: scopedWhere(ctx, { id: input.id }),
      select: { id: true, status: true, paid_vnd: true, pricing_rule_ref: true },
    })
    if (!order) throw notFound()
    const ref = obj(order.pricing_rule_ref)
    const d = obj(ref.dismissal)
    if (order.status !== "CANCELLED" || d.status !== "APPROVED" || Number(order.paid_vnd || 0) > 0) throw conflict(ONLY_DISMISSED)
    const prev: order_status = typeof d.previousStatus === "string" && d.previousStatus !== "CANCELLED" ? (d.previousStatus as order_status) : "DRAFT"
    const history = Array.isArray(ref.dismissalHistory) ? ref.dismissalHistory : []

    await this.db.$transaction(async (tx) => {
      const moved = await tx.orders.updateMany({
        where: scopedWhere(ctx, { id: order.id, status: "CANCELLED" as order_status, paid_vnd: 0 }),
        data: { status: prev, pricing_rule_ref: json({ ...ref, dismissal: null, dismissalHistory: [...history, { ...d, ...stamp }] }) },
      })
      if (moved.count === 0) throw conflict("Đơn hàng vừa thay đổi, vui lòng tải lại")
      await retakeStock(tx, ctx.organizationId, order.id) // trừ lại tồn đã hoàn lúc bỏ hiển thị; không đủ → 409
      await tx.greeting_sessions.updateMany({
        where: scopedWhere(ctx, { order_id: order.id }),
        data: { revoked_at: null, revoked_by: null, expires_at: new Date(now.getTime() + RESTORE_DAYS_MS) },
      })
      await tx.order_events.create({
        data: scopedData(ctx, {
          id: randomUUID(), order_id: order.id, axis: "order", from_value: "CANCELLED", to_value: prev, actor_id: ctx.userId,
          reason: `Khôi phục đơn đã bỏ hiển thị: ${reason}`,
        }),
      })
      await recordAuditLog(ctx, {
        action: "order.restore", entityType: "order", entityId: order.id,
        before: { status: order.status, dismissal: d }, after: { status: prev, ...stamp },
      }, tx)
    })
  }
}

let _dismissalRestoreRepositorySingleton: DismissalRestoreRepository | null = null
export function getDismissalRestoreRepository(): DismissalRestoreRepository {
  if (!_dismissalRestoreRepositorySingleton) _dismissalRestoreRepositorySingleton = new DismissalRestoreRepository()
  return _dismissalRestoreRepositorySingleton
}
