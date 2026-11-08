import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"
import { prisma } from "@/core/tenancy/infra/prisma"

import type { DbClient } from "./transaction"

export interface CoordinatorPaymentLine {
  kind: "DEPOSIT" | "BALANCE" | "REFUND"
  amountVnd: number
  paymentMethod: string | null
  reference: string | null
  evidenceAssetId: string | null
  note: string | null
}

/**
 * Sổ thu Điều phối (ĐP-4a, PO D2). Một dòng `order_payments` mỗi lần thu/hoàn; khoản có hiệu lực ngay
 * cộng vào `orders.paid_vnd`/`balance_vnd` trong CÙNG giao dịch (`runCoordinatorTx`).
 *
 * Audit BL-05 (06/11/2026): trước đây ghi số tuyệt đối tính từ lần đọc — hai lượt thu đồng thời làm mất
 * một khoản trong `paid_vnd`. Nay cập nhật có điều kiện `paid_vnd = <đã đọc>` như `StandardPaymentRepository`.
 */
export class CoordinatorPaymentRepository {
  constructor(private readonly db: DbClient = prisma) {}

  /**
   * Ghi khoản thu. `applied` = số đã thu/còn lại sau khoản này nếu có hiệu lực ngay, `null` nếu chờ Điều hành
   * xác nhận (checklist ALG 1.16 — chưa cộng vào đơn). Trả `null` khi `paid_vnd` đã đổi kể từ lúc đọc.
   */
  async record(
    ctx: TenantContext,
    orderId: string,
    line: CoordinatorPaymentLine,
    applied: { expectedPaidVnd: number; paidAfter: number; balanceAfter: number } | null
  ): Promise<{ id: string } | null> {
    if (applied) {
      const moved = await this.db.orders.updateMany({
        where: scopedWhere(ctx, { id: orderId, paid_vnd: applied.expectedPaidVnd }),
        data: { paid_vnd: applied.paidAfter, balance_vnd: applied.balanceAfter },
      })
      if (moved.count === 0) return null
    }
    const row = await this.db.order_payments.create({
      data: scopedData(ctx, {
        order_id: orderId,
        kind: line.kind,
        amount_vnd: line.amountVnd,
        payment_method: line.paymentMethod,
        reference: line.reference,
        evidence_asset_id: line.evidenceAssetId,
        collected_by: ctx.userId,
        note: line.note,
        status: applied ? "CONFIRMED" : "PENDING",
      }),
    })
    return { id: row.id }
  }

  list(ctx: TenantContext, orderId: string) {
    return this.db.order_payments.findMany({
      where: scopedWhere(ctx, { order_id: orderId }),
      orderBy: { collected_at: "asc" },
    })
  }
}
