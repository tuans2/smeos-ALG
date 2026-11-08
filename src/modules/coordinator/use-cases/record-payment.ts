/**
 * Use-case: sổ thu (ĐP-4a, 26/09/2026, PO D2). Mỗi lần thu hoặc hoàn tiền là
 * MỘT DÒNG `order_payments`; `orders.paid_vnd`/`balance_vnd` được cập nhật
 * TRONG CÙNG giao dịch (§2.14 mục 2 — không ai sửa tay hai con số này).
 *
 * `paymentStatus` KHÔNG được ghi ở đây — nó là trường suy ra, tính lúc đọc
 * (`present-coordinator-order.ts`, §2.15.7), không lưu.
 *
 * Quyền: `kind = REFUND` đòi R10 (trần cứng điều hành) — kiểm ở route
 * (`payments/route.ts`), vì route mới biết `body.kind` trước khi gọi vào
 * đây. Use-case chỉ chặn logic nghiệp vụ — `planPayment`/`planRefund`, chung với sổ đơn (audit BL-05).
 */

import { AppError } from "@/core/http/errors"
import { hasCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import { planPayment, planRefund } from "@/modules/orders/workflow/standard-payment"
import { CoordinatorPaymentRepository } from "../infra/coordinator-payment-repository"
import { getCoordinatorRepository } from "../infra/coordinator-repository"
import type { CoordinatorOrderView } from "./present-coordinator-order"
import { audit, concurrentUpdate, getOrderView, loadEditableOrderOrThrow, loadOrderOrThrow, runCoordinatorTx } from "./shared"

/** Xác nhận tiền về — trần cứng Điều hành (`capability-catalog.ts`). Người có mã này ghi thu là có hiệu lực ngay. */
export const PAYMENT_CONFIRM_CAPABILITY = "R11"

export interface RecordPaymentInput {
  kind: "DEPOSIT" | "BALANCE" | "REFUND"
  amountVnd: number
  paymentMethod?: string | undefined
  reference?: string | undefined
  evidenceAssetId?: string | undefined
  note?: string | undefined
}

export interface OrderPaymentView {
  id: string
  /** PENDING = chờ Điều hành xác nhận (chưa cộng vào số đã thu) · CONFIRMED · REJECTED */
  status: string
  kind: "DEPOSIT" | "BALANCE" | "REFUND"
  amountVnd: number
  paymentMethod: string | null
  reference: string | null
  evidenceAssetId: string | null
  collectedBy: string
  collectedAt: string
  note: string | null
}

export async function recordCoordinatorPayment(
  ctx: TenantContext,
  orderIdOrCode: string,
  input: RecordPaymentInput
): Promise<CoordinatorOrderView> {
  const orderId = await runCoordinatorTx(async (tx) => {
    const row = await loadEditableOrderOrThrow(ctx, getCoordinatorRepository(tx), orderIdOrCode)
    const order = { totalVnd: Number(row.total_vnd), paidVnd: Number(row.paid_vnd), status: row.status }
    // Một luật cho mọi đường ghi tiền (audit BL-05): chặn đơn huỷ, thu vượt phần còn phải thu, hoàn quá số đã thu.
    const plan = input.kind === "REFUND" ? planRefund(order, input.amountVnd) : planPayment(order, input.amountVnd)
    if (typeof plan === "string") throw new AppError("UNPROCESSABLE_ENTITY", `${plan}.`)
    // Sale/Điều phối ghi thu → chờ Điều hành xác nhận, chưa vào sổ (PO 04/11/2026, Q3 phương án b — ALG 1.16)
    const pending = input.kind !== "REFUND" && !hasCapability(ctx, PAYMENT_CONFIRM_CAPABILITY)
    const after = pending
      ? { paidVnd: order.paidVnd, balanceVnd: order.totalVnd - order.paidVnd }
      : { paidVnd: plan.paidAfter, balanceVnd: plan.balanceAfter }

    const payment = await new CoordinatorPaymentRepository(tx).record(
      ctx,
      row.id,
      {
        kind: input.kind,
        amountVnd: input.amountVnd,
        paymentMethod: input.paymentMethod?.trim() || null,
        reference: input.reference?.trim() || null,
        evidenceAssetId: input.evidenceAssetId ?? null,
        note: input.note?.trim() || null,
      },
      pending ? null : { expectedPaidVnd: order.paidVnd, paidAfter: plan.paidAfter, balanceAfter: plan.balanceAfter }
    )
    if (!payment) throw concurrentUpdate()
    await audit(
      ctx,
      tx,
      input.kind === "REFUND" ? "coordinator.order.payment.refund" : pending ? "coordinator.order.payment.pending" : "coordinator.order.payment.record",
      row.id,
      { paidVnd: order.paidVnd, balanceVnd: order.totalVnd - order.paidVnd },
      { ...after, paymentId: payment.id, kind: input.kind, amountVnd: input.amountVnd }
    )
    return row.id
  })
  return getOrderView(ctx, orderId)
}

export async function listCoordinatorPayments(ctx: TenantContext, orderIdOrCode: string): Promise<OrderPaymentView[]> {
  const repo = getCoordinatorRepository()
  const row = await loadOrderOrThrow(ctx, repo, orderIdOrCode)
  const rows = await new CoordinatorPaymentRepository().list(ctx, row.id)
  return rows.map((p) => ({
    id: p.id,
    status: p.status,
    kind: p.kind,
    amountVnd: Number(p.amount_vnd),
    paymentMethod: p.payment_method,
    reference: p.reference,
    evidenceAssetId: p.evidence_asset_id,
    collectedBy: p.collected_by,
    collectedAt: p.collected_at.toISOString(),
    note: p.note,
  }))
}
