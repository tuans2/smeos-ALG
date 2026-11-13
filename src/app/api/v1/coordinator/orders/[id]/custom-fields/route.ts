import { jsonResponse } from "@/core/http/response"
import { parseBody, updateCustomFieldsSchema } from "@/modules/coordinator/adapters/http-schemas"
import { updateCoordinatorCustomFields } from "@/modules/coordinator/use-cases/update-order-custom-fields"
import { defineRoute } from "@/core/http/define-route"

type Params = { params: Promise<{ id: string }> }

/** `PATCH /api/v1/coordinator/orders/:id/custom-fields` (R3, ĐP-3.16) — sửa giá trị trường tự tạo của đơn. */
export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "R3" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const body = await parseBody(request, updateCustomFieldsSchema)
    const order = await updateCoordinatorCustomFields(ctx, id, body.customFields)
    return jsonResponse({ order })
  },
})
