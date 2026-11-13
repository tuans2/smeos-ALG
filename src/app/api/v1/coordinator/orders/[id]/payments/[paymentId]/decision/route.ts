import { requireCapability } from "@/core/rbac/capabilities"
import { jsonResponse } from "@/core/http/response"
import { decidePendingPayment } from "@/modules/coordinator/use-cases/decide-pending-payment"
import { PAYMENT_CONFIRM_CAPABILITY } from "@/modules/coordinator/use-cases/record-payment"
import { defineRoute } from "@/core/http/define-route"

type Params = { params: Promise<{ id: string; paymentId: string }> }

/**
 * `POST /api/v1/coordinator/orders/:id/payments/:paymentId/decision` — Điều hành (R11) xác nhận hoặc từ
 * chối khoản Sale/Điều phối đã ghi (checklist ALG 1.16). Body `{ approve, note? }`.
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "quyền kiểm trong handler: PAYMENT_CONFIRM_CAPABILITY" },
  handler: async ({ request, ctx, params }) => {
    requireCapability(ctx, PAYMENT_CONFIRM_CAPABILITY)
    const { id, paymentId } = params as { id: string; paymentId: string }
    const body = (await request.json().catch(() => ({}))) as { approve?: unknown; note?: unknown }
    const order = await decidePendingPayment(ctx, id, paymentId, body)
    return jsonResponse({ order })
  },
})
