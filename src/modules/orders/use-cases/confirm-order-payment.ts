/**
 * `POST /api/v1/orders/:id/payments` (R11 — trần cứng Điều hành) — Điều hành xác nhận tiền khách đã trả cho
 * đơn ngoài Thẻ chào (P3b). Lần thu đầu: đơn CONFIRMED và sang Điều phối. Thẻ chào giữ luồng riêng (404 ở đây).
 */

import { validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { StandardPaymentRepository } from "../infra/standard-payment-repository"

export const PAYMENT_METHODS = ["BANK_TRANSFER", "CASH", "CARD", "E_WALLET", "COD"] as const

export async function confirmOrderPayment(
  ctx: TenantContext,
  orderId: string,
  input: { amountVnd?: unknown; method?: unknown; reference?: unknown; note?: unknown },
  repo: Pick<StandardPaymentRepository, "record"> = new StandardPaymentRepository(),
  audit: typeof recordAuditLog = recordAuditLog,
) {
  const errors: Record<string, string> = {}
  if (typeof input.amountVnd !== "number" || !Number.isInteger(input.amountVnd) || input.amountVnd <= 0) errors.amountVnd = "Số tiền phải là số nguyên dương"
  if (typeof input.method !== "string" || !(PAYMENT_METHODS as readonly string[]).includes(input.method)) errors.method = "Chọn cách thanh toán"
  if (Object.keys(errors).length > 0) throw validationFailed(errors)
  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 200) : null)
  const result = await repo.record(ctx, { id: orderId }, {
    amountVnd: input.amountVnd as number,
    method: input.method as string,
    reference: text(input.reference),
    note: text(input.note),
  })
  await audit(ctx, { action: "orders.payment.confirm", entityType: "orders", entityId: result.orderId, after: result })
  return result
}
