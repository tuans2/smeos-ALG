/**
 * Ghi thu tiền cho đơn ngoài Thẻ chào + khớp chuyển khoản SePay còn "chưa khớp" sau bộ khớp Thẻ chào (P3b).
 * Đơn `BROCHURE` không bao giờ được ghi ở đây (B1). Bộ quét không có phiên người dùng: tổ chức lấy từ
 * chính dòng giao dịch ngân hàng, đơn tìm trong đúng tổ chức đó.
 */

import { conflict, notFound, unprocessable } from "@/core/http/errors"
import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedWhere, type TenantContext } from "@/core/tenancy/tenant-context"
import { planPayment } from "../workflow/standard-payment"
import { sendToCoordination } from "./coordination-handoff"

export interface PaymentInput {
  amountVnd: number
  method: string
  reference: string | null
  note: string | null
}

export class StandardPaymentRepository {
  /** Ghi một khoản thu; lần đầu → đơn CONFIRMED + sang Điều phối. Cùng một giao dịch. */
  async record(ctx: TenantContext, where: { id: string } | { code: string }, input: PaymentInput, bankEventId?: string) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.orders.findFirst({
        where: scopedWhere(ctx, { ...where, NOT: { source: "BROCHURE" } }),
        select: { id: true, code: true, source: true, status: true, total_vnd: true, paid_vnd: true },
      })
      if (!order) throw notFound()
      const plan = planPayment({ totalVnd: Number(order.total_vnd), paidVnd: Number(order.paid_vnd), status: order.status }, input.amountVnd)
      if (typeof plan === "string") throw unprocessable(plan)
      // Chống ghi trùng khi hai người/hai lượt quét cùng lúc: chỉ cập nhật nếu số đã thu chưa đổi.
      const updated = await tx.orders.updateMany({
        where: scopedWhere(ctx, { id: order.id, paid_vnd: order.paid_vnd }),
        data: { paid_vnd: plan.paidAfter, balance_vnd: plan.balanceAfter, ...(order.status === "DRAFT" ? { status: "CONFIRMED" as const } : {}) },
      })
      if (updated.count === 0) throw conflict("Đơn vừa được ghi thu bởi người khác — tải lại")
      const payment = await tx.order_payments.create({
        data: {
          organization_id: ctx.organizationId, order_id: order.id, kind: plan.kind, amount_vnd: input.amountVnd,
          payment_method: input.method, reference: input.reference, collected_by: ctx.userId, note: input.note,
        },
        select: { id: true },
      })
      if (order.status === "DRAFT") {
        await tx.order_events.create({
          data: { organization_id: ctx.organizationId, order_id: order.id, axis: "order", from_value: "DRAFT", to_value: "CONFIRMED", actor_id: ctx.userId, reason: "Đã xác nhận tiền" },
        })
      }
      if (bankEventId) {
        // Cùng giao dịch: chỉ một lượt nhận được dòng ngân hàng này — không bao giờ ghi thu hai lần.
        const claimed = await tx.greeting_payment_events.updateMany({
          where: { id: bankEventId, organization_id: ctx.organizationId, status: "UNMATCHED", order_id: null },
          data: { status: "MATCHED", order_id: order.id, payment_id: payment.id, note: "Khớp đơn ngoài Thẻ chào (Đơn hàng)" },
        })
        if (claimed.count === 0) throw conflict("Giao dịch ngân hàng đã được xử lý")
      }
      if (plan.firstPayment) await sendToCoordination(tx, ctx, { ...order, status: order.status === "DRAFT" ? "CONFIRMED" : order.status }, "Đã xác nhận tiền — chuyển Điều phối")
      return { orderId: order.id, orderCode: order.code, paymentId: payment.id, kind: plan.kind, paidVnd: plan.paidAfter, balanceVnd: plan.balanceAfter }
    })
  }

  /**
   * Giao dịch ngân hàng bộ khớp Thẻ chào để lại "chưa khớp", từ `since`, theo thứ tự `(created_at, id)`.
   * `after` = dòng cuối của trang trước — dòng không khớp được vẫn "chưa khớp", nên không có con trỏ thì mỗi
   * lượt quét lại đúng 100 dòng cũ nhất và giao dịch mới không bao giờ được xét (audit BL-09).
   */
  async listUnmatched(since: Date, take: number, after?: { createdAt: Date; id: string }) {
    return prisma.greeting_payment_events.findMany({
      where: {
        status: "UNMATCHED",
        order_id: null,
        created_at: { gte: since },
        ...(after ? { OR: [{ created_at: { gt: after.createdAt } }, { created_at: after.createdAt, id: { gt: after.id } }] } : {}),
      },
      orderBy: [{ created_at: "asc" }, { id: "asc" }],
      take,
      select: { id: true, organization_id: true, provider: true, external_id: true, amount_vnd: true, content: true, created_at: true },
    })
  }
}
