import { jsonResponse } from "@/core/http/response"
import { parseBody, closeOrderSchema } from "@/modules/coordinator/adapters/http-schemas"
import { closeCoordinatorOrder } from "@/modules/coordinator/use-cases/operations"
import { defineRoute } from "@/core/http/define-route"

type Params = { params: Promise<{ id: string }> }

/** `POST /api/v1/coordinator/orders/:id/close` (R3) — nghiệm thu, chốt tiền công đối tác, đóng đơn (F14). */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "R3" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const body = await parseBody(request, closeOrderSchema)
    const order = await closeCoordinatorOrder(ctx, id, body)
    return jsonResponse({ order })
  },
})
