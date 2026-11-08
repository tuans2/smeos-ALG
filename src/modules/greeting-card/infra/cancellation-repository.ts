import { randomUUID } from "node:crypto"
import type { Prisma } from "@/generated/prisma/client"
import { conflict, notFound, validationFailed } from "@/core/http/errors"
import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import {
  type CancellationPayload,
  type CancellationProposal,
  autoApprovedNotice,
  isInTransit,
  resolveRefundVnd,
  validateCancellationProposalData,
} from "../domain/cancellation-request"
import { roleOf, type MessageRole } from "../domain/internal-message"
import { cancelBlocker } from "../domain/brochure-payment-policy"
import { saleCancellationReminder } from "../domain/customer-cancellation-notice"
import { getVoucherRedemptionRepository } from "@/modules/promotions/infra/voucher-redemption-repository"
import { returnStock } from "@/modules/orders/infra/order-stock"

type Loose = Record<string, unknown>
const obj = (v: unknown): Loose => (v && typeof v === "object" ? (v as Loose) : {})

export class CancellationRepository {
  constructor(private readonly db = prisma) {}

  async getOrderSummary(ctx: TenantContext, orderId: string) {
    const o = await this.db.orders.findFirst({
      where: scopedWhere(ctx, { id: orderId, source: "BROCHURE" }),
      select: {
        id: true,
        code: true,
        status: true,
        production_status: true,
        delivery_status: true,
        total_vnd: true,
        paid_vnd: true,
        balance_vnd: true,
      },
    })
    if (!o) return null
    return {
      id: o.id,
      code: o.code,
      status: o.status,
      productionStatus: o.production_status,
      deliveryStatus: o.delivery_status,
      totalVnd: Number(o.total_vnd),
      paidVnd: Number(o.paid_vnd),
      balanceVnd: Number(o.balance_vnd),
    }
  }

  /**
   * Tạo đề xuất Hủy/Hoàn tiền từ Sale hoặc Điều phối.
   * Lưu dưới dạng tin nhắn hệ thống loại CANCELLATION_REQUEST gửi tới to_role: ADMIN.
   */
  async createProposal(
    ctx: TenantContext,
    input: {
      orderId: string
      senderRole: MessageRole
      proposal: CancellationProposal
    }
  ) {
    const order = await this.getOrderSummary(ctx, input.orderId)
    if (!order) throw notFound()

    const err = validateCancellationProposalData(input.proposal, order)
    if (err) throw validationFailed({ proposal: err })

    const payload: CancellationPayload = {
      ...input.proposal,
      status: "PENDING",
      orderId: order.id,
      orderCode: order.code,
      totalVnd: order.totalVnd,
      paidVnd: order.paidVnd,
      proposedBy: ctx.userId,
      proposedAt: new Date().toISOString(),
    }

    const msg = await this.db.greeting_messages.create({
      data: scopedData(ctx, {
        id: randomUUID(),
        order_id: order.id,
        step_key: "GENERAL",
        sender_id: ctx.userId,
        sender_role: input.senderRole,
        to_role: "ADMIN",
        kind: "CANCELLATION_REQUEST",
        body: input.proposal.reason,
        payload: payload as unknown as Prisma.InputJsonValue,
      }),
      select: { id: true, created_at: true },
    })

    await recordAuditLog(ctx, {
      action: "order.cancellation.propose",
      entityType: "order",
      entityId: order.id,
      before: { status: order.status },
      after: { proposal: payload },
    })

    return { id: msg.id, payload }
  }

  /**
   * Điều hành phê duyệt hoặc từ chối đề xuất Hủy/Hoàn tiền.
   */
  async decide(
    ctx: TenantContext,
    input: {
      requestId: string
      approve: boolean
      note: string
      actualRefundVnd?: number | undefined
      /** Hệ thống tự duyệt do quá hạn: không ghi sổ hoàn (chưa chuyển tiền) mà giao việc cho Điều hành. */
      autoTimeoutMinutes?: number | undefined
    }
  ) {
    const auto = input.autoTimeoutMinutes !== undefined
    return this.db.$transaction(async (tx) => {
      const req = await tx.greeting_messages.findFirst({
        where: scopedWhere(ctx, { id: input.requestId, kind: "CANCELLATION_REQUEST" }),
        select: { id: true, order_id: true, sender_id: true, sender_role: true, body: true, payload: true },
      })
      if (!req || !req.order_id) throw notFound()

      const payload = obj(req.payload) as unknown as CancellationPayload
      if (payload.status !== "PENDING") throw conflict("Yêu cầu này đã được xử lý trước đó")

      const order = await tx.orders.findFirst({
        where: scopedWhere(ctx, { id: req.order_id }),
        select: { id: true, code: true, status: true, delivery_status: true, total_vnd: true, paid_vnd: true, balance_vnd: true },
      })
      if (!order) throw notFound()

      const cancels = payload.type === "CANCEL_ONLY" || payload.type === "FULL_REFUND"
      if (input.approve && order.status === "CANCELLED") throw conflict("Đơn hàng này đã bị hủy trước đó.")
      // Cùng luật với nút Huỷ của sổ thu: đơn đã giao xong không huỷ được (hoàn một phần vẫn được)
      const blocker = input.approve && cancels ? cancelBlocker({ status: order.status, deliveryStatus: order.delivery_status }) : null
      if (blocker) throw conflict(blocker)

      // Đơn đang giao: bắt buộc có người duyệt — hệ thống không tự duyệt khi quá hạn (mục 6, PO 15/10/2026)
      if (auto && cancels && isInTransit(order.delivery_status)) throw conflict("Đơn đang giao — cần Điều hành hoặc Điều phối duyệt huỷ")

      const refundVnd = input.approve
        ? resolveRefundVnd(payload.type, Number(order.paid_vnd), payload.refundAmountVnd, input.actualRefundVnd)
        : 0

      if (input.approve && refundVnd > Number(order.paid_vnd)) {
        throw conflict(`Số tiền hoàn (${refundVnd.toLocaleString("vi-VN")}đ) vượt quá số tiền đã thu (${Number(order.paid_vnd).toLocaleString("vi-VN")}đ).`)
      }

      const now = new Date()

      // 1. Duyệt KHÔNG chuyển tiền (PO 15/10/2026, mục 6): hoàn tiền là bước riêng ở danh sách "Cần hoàn tiền"
      //    — Điều hành ghi khoản hoàn vào sổ thu khi tiền đã thật sự chuyển (CancellationFollowUpRepository.complete).
      // 2. Nếu duyệt hủy đơn (CANCEL_ONLY hoặc FULL_REFUND) -> chuyển trạng thái orders thành CANCELLED
      const shouldCancelOrder = input.approve && cancels
      if (shouldCancelOrder) {
        const cancelled = await tx.orders.updateMany({
          where: scopedWhere(ctx, { id: order.id, status: order.status }),
          data: { status: "CANCELLED" },
        })
        if (cancelled.count === 0) throw conflict("Đơn hàng vừa thay đổi trạng thái, vui lòng tải lại")
        // Trả lại mã giảm giá khách đã dùng — như nút Huỷ của sổ thu; hoàn tồn đã trừ lúc đặt (PO 07/11/2026)
        await getVoucherRedemptionRepository(tx).releaseForOrder(ctx.organizationId, order.id)
        await returnStock(ctx.organizationId, order.id, tx)

        await tx.order_events.create({
          data: scopedData(ctx, {
            id: randomUUID(),
            order_id: order.id,
            axis: "order",
            from_value: order.status,
            to_value: "CANCELLED",
            actor_id: ctx.userId,
            reason: `${auto ? "Hệ thống tự duyệt" : "Đã duyệt"} đề xuất hủy đơn: ${input.note || payload.reason}`,
          }),
        })
      }

      // 3. Khóa trạng thái yêu cầu
      const decidedPayload: CancellationPayload = {
        ...payload,
        status: input.approve ? "APPROVED" : "REJECTED",
        decidedBy: ctx.userId,
        decidedAt: now.toISOString(),
        decidedNote: input.note || undefined,
        actualRefundVnd: 0,
        ...(auto ? { autoApproved: true } : {}),
        ...(auto || (input.approve && refundVnd > 0) ? { followUp: { status: "PENDING" as const, refundDueVnd: refundVnd } } : {}),
      }

      const updatedReq = await tx.greeting_messages.updateMany({
        where: { id: req.id, organization_id: ctx.organizationId, payload: { path: ["status"], equals: "PENDING" } },
        data: { payload: decidedPayload as unknown as Prisma.InputJsonValue },
      })
      if (updatedReq.count === 0) throw conflict("Yêu cầu này đã được xử lý bởi người khác")

      // 4. Tạo thông báo kết quả trả về cho người đề xuất
      await tx.greeting_messages.create({
        data: scopedData(ctx, {
          id: randomUUID(),
          order_id: order.id,
          step_key: "GENERAL",
          sender_id: ctx.userId,
          sender_role: auto ? "ADMIN" : roleOf(ctx.capabilities) ?? "ADMIN",
          to_user_id: req.sender_id,
          kind: "CANCELLATION_DECISION",
          reply_to_id: req.id,
          body: input.note || (input.approve ? "Đã duyệt đề xuất hủy/hoàn tiền" : "Từ chối đề xuất hủy/hoàn tiền"),
          payload: decidedPayload as unknown as Prisma.InputJsonValue,
        }),
      })

      // 4b. Tự duyệt → báo Điều hành: đơn đã huỷ, còn phải hoàn tiền / liên hệ khách
      if (auto) {
        await tx.greeting_messages.create({
          data: scopedData(ctx, {
            id: randomUUID(), order_id: order.id, step_key: "GENERAL", sender_id: ctx.userId, sender_role: "ADMIN",
            to_role: "ADMIN", kind: "CANCELLATION_AUTO_APPROVED", reply_to_id: req.id,
            body: autoApprovedNotice(order.code, input.autoTimeoutMinutes ?? 0, refundVnd),
            payload: decidedPayload as unknown as Prisma.InputJsonValue,
          }),
        })
      }

      // 4c. Điều phối huỷ (đã duyệt) → nhắc Sale phụ trách gọi/nhắn khách, lo hoàn tiền trong 2 tiếng (PO 16/10/2026)
      if (shouldCancelOrder && req.sender_role === "COORDINATOR") {
        const session = await tx.greeting_sessions.findFirst({
          where: scopedWhere(ctx, { order_id: order.id }),
          select: { sale_id: true, status: true, payment_proof_asset_id: true },
        })
        const reported = session?.status === "PAYMENT_REPORTED" || Boolean(session?.payment_proof_asset_id)
        await tx.greeting_messages.create({
          data: scopedData(ctx, {
            id: randomUUID(), order_id: order.id, step_key: "GENERAL", sender_id: "system:cancellation-notice", sender_role: "ADMIN",
            to_user_id: session?.sale_id ?? null, to_role: session ? null : "SALE", kind: "MESSAGE", reply_to_id: req.id,
            body: saleCancellationReminder({ orderCode: order.code, decidedAt: now, refundVnd, customerReportedPayment: Number(order.paid_vnd) === 0 && reported }),
          }),
        })
      }

      // 5. Ghi audit log
      await recordAuditLog(ctx, {
        action: auto ? "order.cancellation.auto_approve" : input.approve ? "order.cancellation.approve" : "order.cancellation.reject",
        entityType: "order",
        entityId: order.id,
        before: { status: order.status, paidVnd: Number(order.paid_vnd) },
        after: {
          status: shouldCancelOrder ? "CANCELLED" : order.status,
          refundVnd,
          decided: decidedPayload,
        },
      }, tx)

      return {
        orderId: order.id,
        orderCode: order.code,
        status: decidedPayload.status,
        orderStatus: shouldCancelOrder ? "CANCELLED" : order.status,
        refundVnd,
      }
    })
  }

  /** Loại đề xuất đang chờ duyệt — route dùng để gác năng lực trước khi gọi `decide`. */
  async getPendingType(ctx: TenantContext, requestId: string): Promise<CancellationPayload["type"] | null> {
    return (await this.getPendingInfo(ctx, requestId))?.type ?? null
  }

  /** Loại đề xuất + người đề xuất + trạng thái giao của đơn — để kiểm ai được duyệt (mục 6, PO 15/10/2026). */
  async getPendingInfo(ctx: TenantContext, requestId: string) {
    const req = await this.db.greeting_messages.findFirst({
      where: scopedWhere(ctx, { id: requestId, kind: "CANCELLATION_REQUEST" }),
      select: { payload: true, sender_id: true, order_id: true },
    })
    if (!req) return null
    const type = obj(req.payload).type
    if (type !== "CANCEL_ONLY" && type !== "FULL_REFUND" && type !== "PARTIAL_REFUND") return null
    const order = req.order_id
      ? await this.db.orders.findFirst({ where: scopedWhere(ctx, { id: req.order_id }), select: { delivery_status: true } })
      : null
    return { type: type as CancellationPayload["type"], requesterId: req.sender_id, deliveryStatus: order?.delivery_status ?? null }
  }

  /** Lấy danh sách đề xuất hủy/hoàn tiền đang chờ duyệt cho Điều hành */
  async listPending(ctx: TenantContext) {
    const rows = await this.db.greeting_messages.findMany({
      where: scopedWhere(ctx, { kind: "CANCELLATION_REQUEST", payload: { path: ["status"], equals: "PENDING" } }),
      select: { id: true, order_id: true, sender_id: true, body: true, payload: true, created_at: true },
      orderBy: { created_at: "asc" },
      take: 200,
    })
    // Trạng thái giao hiện tại của đơn — cảnh báo khi shipper đang trên đường (mục 6, PO 15/10/2026)
    const ids = rows.flatMap((r) => (r.order_id ? [r.order_id] : []))
    const orders = ids.length
      ? await this.db.orders.findMany({ where: scopedWhere(ctx, { id: { in: ids } }), select: { id: true, delivery_status: true } })
      : []
    const delivery = new Map(orders.map((o) => [o.id, o.delivery_status as string]))
    return rows.map((r) => ({ ...r, delivery_status: r.order_id ? delivery.get(r.order_id) ?? null : null }))
  }
}

let _cancellationRepositorySingleton: CancellationRepository | null = null
export function getCancellationRepository(): CancellationRepository {
  if (!_cancellationRepositorySingleton) _cancellationRepositorySingleton = new CancellationRepository()
  return _cancellationRepositorySingleton
}
