import { scopedWhere, type TenantContext } from "@/core/tenancy"

import type { DbClient } from "./transaction"

/**
 * Dòng sổ thu chờ Điều hành xác nhận (checklist ALG 1.16). Đổi trạng thái bằng câu cập nhật có điều
 * kiện `status = PENDING` — hai lượt bấm cùng lúc chỉ một lượt có hiệu lực.
 */
export class PendingPaymentRepository {
  constructor(private readonly db: DbClient) {}

  findPending(ctx: TenantContext, orderId: string, paymentId: string) {
    return this.db.order_payments.findFirst({
      where: scopedWhere(ctx, { id: paymentId, order_id: orderId, status: "PENDING" }),
      select: { id: true, amount_vnd: true, kind: true, collected_by: true },
    })
  }

  async settle(ctx: TenantContext, paymentId: string, status: "CONFIRMED" | "REJECTED"): Promise<boolean> {
    const moved = await this.db.order_payments.updateMany({ where: scopedWhere(ctx, { id: paymentId, status: "PENDING" }), data: { status } })
    return moved.count > 0
  }

  /** Đơn bị huỷ → mọi khoản còn chờ xác nhận chuyển "Đã từ chối" trong giao dịch huỷ (audit BL-21). Trả số khoản. */
  async rejectAllForOrder(ctx: TenantContext, orderId: string): Promise<number> {
    const moved = await this.db.order_payments.updateMany({ where: scopedWhere(ctx, { order_id: orderId, status: "PENDING" }), data: { status: "REJECTED" } })
    return moved.count
  }

  /** Cộng khoản đã xác nhận vào đơn, chỉ khi số đã thu chưa đổi kể từ lúc đọc. */
  async applyToOrder(ctx: TenantContext, orderId: string, expectedPaidVnd: number, paidAfter: number, balanceAfter: number): Promise<boolean> {
    const moved = await this.db.orders.updateMany({
      where: scopedWhere(ctx, { id: orderId, paid_vnd: expectedPaidVnd }),
      data: { paid_vnd: paidAfter, balance_vnd: balanceAfter },
    })
    return moved.count > 0
  }
}
