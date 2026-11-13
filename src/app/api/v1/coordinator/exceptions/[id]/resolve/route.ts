import { jsonResponse } from "@/core/http/response"
import { parseBody, resolveExceptionSchema } from "@/modules/coordinator/adapters/http-schemas"
import { resolveCoordinatorException } from "@/modules/coordinator/use-cases/manage-exceptions"
import { defineRoute } from "@/core/http/define-route"

type Params = { params: Promise<{ id: string }> }

/** `POST /api/v1/coordinator/exceptions/:id/resolve` (R3) — xử lý xong sự cố; hết sự cố thì đơn tự về bước cũ (F13). */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "R3" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const body = await parseBody(request, resolveExceptionSchema)
    const order = await resolveCoordinatorException(ctx, id, body)
    return jsonResponse({ order })
  },
})
