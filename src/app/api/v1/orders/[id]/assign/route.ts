import { jsonResponse } from "@/core/http/response"
import { assignFlorist } from "@/modules/orders/use-cases/assign-florist"
import { assignOrderBody } from "@/app/api/v1/_contracts/requests-orders"
import { defineRoute } from "@/core/http/define-route"

/** `POST /api/v1/orders/:id/assign` (R4) — Phân công thợ chế tác */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "R4" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const body = await request.json()
    const parsed = assignOrderBody.parse(body)

    const updated = await assignFlorist(ctx, id, parsed)
    return jsonResponse({ order: updated })
  },
})
