import { handle, jsonResponse } from "@/core/http/response"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { cancelOrder } from "@/modules/orders/use-cases/cancel-order"
import { cancelOrderBody } from "@/app/api/v1/_contracts/requests-orders"

/** `POST /api/v1/orders/:id/cancel` (R6 — Trần cứng Điều hành) */
export const POST = handle(async (request, context: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(request)

  const { id } = await context.params
  const body = await request.json()
  const { reason } = cancelOrderBody.parse(body)

  const updated = await cancelOrder(ctx, id, reason)
  return jsonResponse({ order: updated })
})
