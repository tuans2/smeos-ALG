import { randomUUID } from "node:crypto"
import type { Prisma } from "@/generated/prisma/client"
import { conflict, notFound } from "@/core/http/errors"
import { prisma } from "@/core/tenancy/infra/prisma"
import { withOrganizationIndustry } from "@/modules/organization/domain/industry-key"
import { ORG_SETTINGS_SELECT } from "@/modules/organization/infra/organization-industry"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { needsFollowUp, type CancellationPayload } from "../domain/cancellation-request"
import { CancellationRepository } from "./cancellation-repository"

type Loose = Record<string, unknown>
const obj = (v: unknown): Loose => (v && typeof v === "object" ? (v as Loose) : {})

/**
 * Đề xuất huỷ do Điều phối từ chối nhận đơn mà Điều hành không phản hồi kịp hạn: hệ thống tự duyệt
 * huỷ, rồi giao lại cho Điều hành phần hệ thống không tự làm được (chuyển hoàn tiền, liên hệ khách).
 * Việc đó nằm trong Hộp việc tới khi Điều hành đánh dấu xong — lịch sử ở order_events + audit log.
 */
export class CancellationFollowUpRepository {
  constructor(private readonly db = prisma, private readonly cancellations = new CancellationRepository(db)) {}

  /** Đề xuất từ chối nhận đơn của Điều phối còn PENDING, tạo trước `before` (bộ quét lọc kỹ theo từng tiệm). */
  async listExpiredCoordinatorRejections(before: Date, take = 50) {
    const rows = await this.db.greeting_messages.findMany({
      where: {
        kind: "CANCELLATION_REQUEST",
        sender_role: "COORDINATOR",
        created_at: { lte: before },
        payload: { path: ["status"], equals: "PENDING" },
      },
      select: { id: true, organization_id: true, order_id: true, created_at: true, organization: { select: ORG_SETTINGS_SELECT } },
      orderBy: { created_at: "asc" },
      take,
    })
    return rows.map((r) => withOrganizationIndustry(r)) // ngành theo cột (ADR-012 T-6c-1)
  }

  /** Tự duyệt huỷ do quá hạn — không ghi sổ hoàn, đánh dấu việc chờ Điều hành, báo Điều hành. */
  async autoApproveExpired(organizationId: string, requestId: string, timeoutMinutes: number) {
    const sysCtx: TenantContext = {
      organizationId,
      workspaceId: "system",
      userId: "system:cancellation-timeout",
      branchId: null,
      capabilities: new Set(["R6", "R10", "R11"]),
    }
    return this.cancellations.decide(sysCtx, {
      requestId,
      approve: true,
      note: `Hệ thống tự động phê duyệt hủy đơn do Điều hành không phản hồi trong thời gian quy định (${timeoutMinutes} phút).`,
      autoTimeoutMinutes: timeoutMinutes,
    })
  }

  /** Đơn đã huỷ / đề xuất hoàn đã duyệt còn chờ chuyển tiền hoàn — danh sách "Cần hoàn tiền" ở Hộp việc. */
  async listPending(ctx: TenantContext) {
    const rows = await this.db.greeting_messages.findMany({
      where: scopedWhere(ctx, {
        kind: "CANCELLATION_REQUEST",
        payload: { path: ["followUp", "status"], equals: "PENDING" },
      }),
      select: { id: true, order_id: true, body: true, payload: true, created_at: true },
      orderBy: { created_at: "asc" },
      take: 200,
    })
    return rows.map((r) => ({ ...r, payload: obj(r.payload) as unknown as CancellationPayload })).filter((r) => needsFollowUp(r.payload))
  }

  /**
   * Khoản hoàn đang chờ ở "Cần hoàn tiền" theo từng đơn (đơn → số tiền). Đơn có khoản này không được ghi
   * hoàn trực tiếp ở sổ thu — nếu không cùng một khoản hoàn bị ghi hai lần.
   */
  async pendingRefundsByOrder(ctx: TenantContext, orderIds: readonly string[]): Promise<Map<string, number>> {
    if (orderIds.length === 0) return new Map()
    const rows = await this.db.greeting_messages.findMany({
      where: scopedWhere(ctx, {
        kind: "CANCELLATION_REQUEST",
        order_id: { in: [...new Set(orderIds)] },
        payload: { path: ["followUp", "status"], equals: "PENDING" },
      }),
      select: { order_id: true, payload: true },
    })
    const due = new Map<string, number>()
    for (const r of rows) {
      const payload = obj(r.payload) as unknown as CancellationPayload
      if (!r.order_id || !needsFollowUp(payload) || !payload.followUp) continue
      due.set(r.order_id, (due.get(r.order_id) ?? 0) + Math.max(0, Math.round(payload.followUp.refundDueVnd)))
    }
    return due
  }

  /**
   * Điều hành xác nhận đã xử lý xong: nếu còn tiền phải hoàn thì lúc này mới ghi khoản REFUND vào
   * sổ thu (tiền đã thật sự chuyển). Hai người bấm cùng lúc → chỉ một bên ghi.
   */
  async complete(ctx: TenantContext, requestId: string, note: string) {
    return this.db.$transaction(async (tx) => {
      const req = await tx.greeting_messages.findFirst({
        where: scopedWhere(ctx, { id: requestId, kind: "CANCELLATION_REQUEST" }),
        select: { id: true, order_id: true, payload: true },
      })
      if (!req || !req.order_id) throw notFound()
      const payload = obj(req.payload) as unknown as CancellationPayload
      if (!needsFollowUp(payload) || !payload.followUp) throw conflict("Việc này đã được xử lý trước đó")
      const refundVnd = Math.max(0, Math.round(payload.followUp.refundDueVnd))

      const order = await tx.orders.findFirst({
        where: scopedWhere(ctx, { id: req.order_id }),
        select: { id: true, total_vnd: true, paid_vnd: true },
      })
      if (!order) throw notFound()
      if (refundVnd > Number(order.paid_vnd)) throw conflict("Số tiền hoàn vượt quá số tiền đã thu, vui lòng kiểm tra sổ thu")

      const now = new Date()
      const doneNote = note.trim() || undefined
      if (refundVnd > 0) {
        await tx.order_payments.create({
          data: scopedData(ctx, {
            id: randomUUID(), order_id: order.id, kind: "REFUND", amount_vnd: refundVnd, payment_method: "BANK_TRANSFER",
            collected_by: ctx.userId, collected_at: now, note: `Hoàn tiền ${payload.autoApproved ? "đơn tự huỷ" : "theo đề xuất đã duyệt"}${doneNote ? `: ${doneNote}` : ""}`,
          }),
        })
        const newPaid = Number(order.paid_vnd) - refundVnd
        const moved = await tx.orders.updateMany({
          where: scopedWhere(ctx, { id: order.id, paid_vnd: order.paid_vnd }),
          data: { paid_vnd: newPaid, balance_vnd: Number(order.total_vnd) - newPaid },
        })
        if (moved.count === 0) throw conflict("Đơn hàng vừa được cập nhật thanh toán, vui lòng tải lại")
      }

      const done: CancellationPayload = {
        ...payload,
        actualRefundVnd: refundVnd,
        followUp: { ...payload.followUp, status: "DONE", doneBy: ctx.userId, doneAt: now.toISOString(), note: doneNote },
      }
      const updated = await tx.greeting_messages.updateMany({
        where: { id: req.id, organization_id: ctx.organizationId, payload: { path: ["followUp", "status"], equals: "PENDING" } },
        data: { payload: done as unknown as Prisma.InputJsonValue },
      })
      if (updated.count === 0) throw conflict("Việc này đã được xử lý bởi người khác")

      await recordAuditLog(ctx, {
        action: "order.cancellation.follow_up_done",
        entityType: "order",
        entityId: order.id,
        before: { paidVnd: Number(order.paid_vnd), followUp: payload.followUp },
        after: { refundVnd, followUp: done.followUp },
      }, tx)

      return { orderId: order.id, refundVnd }
    })
  }
}

let _cancellationFollowUpRepositorySingleton: CancellationFollowUpRepository | null = null
export function getCancellationFollowUpRepository(): CancellationFollowUpRepository {
  if (!_cancellationFollowUpRepositorySingleton) _cancellationFollowUpRepositorySingleton = new CancellationFollowUpRepository()
  return _cancellationFollowUpRepositorySingleton
}
