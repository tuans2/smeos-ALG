import { jsonResponse } from "@/core/http/response"
import { parseBody, cancelOrderSchema } from "@/modules/coordinator/adapters/http-schemas"
import { cancelCoordinatorOrder } from "@/modules/coordinator/use-cases/operations"
import { defineRoute } from "@/core/http/define-route"

type Params = { params: Promise<{ id: string }> }

/** `POST /api/v1/coordinator/orders/:id/cancel` (R6, trần cứng điều hành) — huỷ đơn, bắt buộc lý do. */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "R6" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const body = await parseBody(request, cancelOrderSchema)
    const order = await cancelCoordinatorOrder(ctx, id, body)
    return jsonResponse({ order })
  },
})
