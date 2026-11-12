import { jsonResponse } from "@/core/http/response"
import { markAllInboxItemsRead } from "@/modules/notification/use-cases/manage-inbox"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "đánh dấu đã đọc tin của chính mình" },
  handler: async ({ ctx, resolved }) => {
    const count = await markAllInboxItemsRead(resolved.user.id, ctx.organizationId)
    return jsonResponse({ success: true, count })
  },
})
