import { jsonResponse } from "@/core/http/response"
import { parseBody, updatePartnerSchema } from "@/modules/coordinator/adapters/http-schemas"
import { updatePartner } from "@/modules/coordinator/use-cases/manage-partners"
import { defineRoute } from "@/core/http/define-route"

type Params = { params: Promise<{ id: string }> }

/** `PATCH /api/v1/coordinator/partners/:id` (R4) — sửa hồ sơ, tạm ngưng/mở lại đối tác. */
export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "R4" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const body = await parseBody(request, updatePartnerSchema)
    const partner = await updatePartner(ctx, id, body)
    return jsonResponse({ data: partner })
  },
})
