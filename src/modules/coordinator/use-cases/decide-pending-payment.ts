import { conflict, notFound, unprocessable, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import { assertNotSelfApproval } from "@/modules/organization/use-cases/assert-not-self-approval"

import { getCoordinatorRepository } from "../infra/coordinator-repository"
import { PendingPaymentRepository } from "../infra/pending-payment-repository"
import type { CoordinatorOrderView } from "./present-coordinator-order"
import { audit, getOrderView, loadEditableOrderOrThrow, runCoordinatorTx } from "./shared"

/**
 * `POST /coordinator/orders/:id/payments/:paymentId/decision` (R11 — trần cứng Điều hành): xác nhận
 * khoản Sale/Điều phối đã ghi thì mới cộng vào số đã thu; từ chối thì khoản đó không vào sổ
 * (PO 04/11/2026, Q3 phương án b — checklist ALG 1.16).
 */
export async function decidePendingPayment(
  ctx: TenantContext,
  orderIdOrCode: string,
  paymentId: string,
  input: { approve?: unknown; note?: unknown }
): Promise<CoordinatorOrderView> {
  if (typeof input.approve !== "boolean") throw validationFailed({ approve: "Chọn xác nhận hoặc từ chối" })
  const approve = input.approve
  const note = typeof input.note === "string" ? input.note.trim().slice(0, 500) : ""
  if (!approve && note.length < 3) throw validationFailed({ note: "Ghi lý do từ chối" })

  const orderId = await runCoordinatorTx(async (tx) => {
    const row = await loadEditableOrderOrThrow(ctx, getCoordinatorRepository(tx), orderIdOrCode)
    const pending = new PendingPaymentRepository(tx)
    const payment = await pending.findPending(ctx, row.id, paymentId)
    if (!payment) throw notFound()
    await assertNotSelfApproval(ctx, payment.collected_by)

    const paidBefore = Number(row.paid_vnd)
    const totalVnd = Number(row.total_vnd)
    const amount = Number(payment.amount_vnd)
    if (approve && paidBefore + amount > totalVnd) throw unprocessable("Khoản này vượt số còn phải thu của đơn — từ chối và nhờ ghi lại đúng số")

    if (!(await pending.settle(ctx, payment.id, approve ? "CONFIRMED" : "REJECTED"))) throw conflict("Khoản này đã được xử lý")
    if (approve && !(await pending.applyToOrder(ctx, row.id, paidBefore, paidBefore + amount, totalVnd - paidBefore - amount))) {
      throw conflict("Đơn vừa được ghi thu bởi người khác — tải lại")
    }
    await audit(
      ctx,
      tx,
      approve ? "coordinator.order.payment.confirm" : "coordinator.order.payment.reject",
      row.id,
      { paidVnd: paidBefore, paymentId: payment.id },
      { paidVnd: approve ? paidBefore + amount : paidBefore, paymentId: payment.id, amountVnd: amount, note: note || null }
    )
    return row.id
  })
  return getOrderView(ctx, orderId)
}
