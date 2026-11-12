import { jsonResponse } from "@/core/http/response"
import { parseBody, assignPartnerSchema } from "@/modules/coordinator/adapters/http-schemas"
import { assignPartner } from "@/modules/coordinator/use-cases/operations"
import { defineRoute } from "@/core/http/define-route"

type Params = { params: Promise<{ id: string }> }

/** `POST /api/v1/coordinator/orders/:id/assign-partner` (R4) — phân công đối tác xưởng (F05). */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "R4" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const body = await parseBody(request, assignPartnerSchema)
    const order = await assignPartner(ctx, id, body)
    return jsonResponse({ order })
  },
})
