import { jsonResponse } from "@/core/http/response"
import { parseBody, deliveryUpdateSchema } from "@/modules/coordinator/adapters/http-schemas"
import { recordDeliveryUpdate } from "@/modules/coordinator/use-cases/record-delivery-update"
import { defineRoute } from "@/core/http/define-route"

type Params = { params: Promise<{ id: string }> }

/** `POST /api/v1/coordinator/orders/:id/delivery` (R5) — theo dõi giao hàng và POD (F11/F12). */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "R5" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const body = await parseBody(request, deliveryUpdateSchema)
    const order = await recordDeliveryUpdate(ctx, id, body)
    return jsonResponse({ order })
  },
})
