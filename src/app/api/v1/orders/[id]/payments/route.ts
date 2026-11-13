/**
 * `POST /api/v1/orders/:id/payments` (R11 — trần cứng Điều hành) — xác nhận tiền đơn ngoài Thẻ chào.
 * Body `{ amountVnd, method: BANK_TRANSFER|CASH|CARD|E_WALLET|COD, reference?, note? }`.
 */

import { jsonResponse } from "@/core/http/response"
import { confirmOrderPayment } from "@/modules/orders/use-cases/confirm-order-payment"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "R11" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>
    return jsonResponse(await confirmOrderPayment(ctx, id, body), { status: 201 })
  },
})
