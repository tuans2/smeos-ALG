import { jsonResponse } from "@/core/http/response"
import { markInboxItemRead } from "@/modules/notification/use-cases/manage-inbox"
import { defineRoute } from "@/core/http/define-route"

type RouteContext = { params: Promise<{ id: string }> }

export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "đánh dấu đã đọc tin của chính mình" },
  handler: async ({ ctx, resolved, params }) => {
    const { id } = params as { id: string }

    const success = await markInboxItemRead(id, resolved.user.id, ctx.organizationId)
    return jsonResponse({ success, id })
  },
})
