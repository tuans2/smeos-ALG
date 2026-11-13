import { jsonResponse } from "@/core/http/response"
import { removeMember } from "@/modules/organization/use-cases/remove-member"
import { defineRoute } from "@/core/http/define-route"

export const DELETE = defineRoute({
  auth: { kind: "tenant", capability: "F4" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    await removeMember(ctx, id)
    return jsonResponse(null, { status: 204 })
  },
})
