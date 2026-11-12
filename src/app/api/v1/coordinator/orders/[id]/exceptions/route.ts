import { jsonResponse } from "@/core/http/response"
import { parseBody, openExceptionSchema } from "@/modules/coordinator/adapters/http-schemas"
import { openCoordinatorException } from "@/modules/coordinator/use-cases/manage-exceptions"
import { defineRoute } from "@/core/http/define-route"

type Params = { params: Promise<{ id: string }> }

/** `POST /api/v1/coordinator/orders/:id/exceptions` (R3) — mở sự cố (F13). */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "R3" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const body = await parseBody(request, openExceptionSchema)
    const order = await openCoordinatorException(ctx, id, body)
    return jsonResponse({ order }, { status: 201 })
  },
})
