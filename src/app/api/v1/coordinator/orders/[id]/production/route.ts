import { jsonResponse } from "@/core/http/response"
import { parseBody, productionUpdateSchema } from "@/modules/coordinator/adapters/http-schemas"
import { recordProductionUpdate } from "@/modules/coordinator/use-cases/operations"
import { defineRoute } from "@/core/http/define-route"

type Params = { params: Promise<{ id: string }> }

/** `POST /api/v1/coordinator/orders/:id/production` (R3) — tiến độ cắm, báo cắm xong kèm ảnh, báo thiếu vật liệu (F08). */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "R3" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const body = await parseBody(request, productionUpdateSchema)
    const order = await recordProductionUpdate(ctx, id, body)
    return jsonResponse({ order })
  },
})
