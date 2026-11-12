import { jsonResponse } from "@/core/http/response"
import { cancelOrder } from "@/modules/orders/use-cases/cancel-order"
import { cancelOrderBody } from "@/app/api/v1/_contracts/requests-orders"
import { defineRoute } from "@/core/http/define-route"

/** `POST /api/v1/orders/:id/cancel` (R6 — Trần cứng Điều hành) */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: cancelOrder" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const body = await request.json()
    const { reason } = cancelOrderBody.parse(body)

    const updated = await cancelOrder(ctx, id, reason)
    return jsonResponse({ order: updated })
  },
})
