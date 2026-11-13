import { defineRoute } from "@/core/http/define-route"
import { jsonResponse } from "@/core/http/response"
import { declineInvitation } from "@/modules/organization/use-cases/manage-invitations"

/** `POST /session/invitations/:id/decline` — từ chối lời mời của chính mình (xoá thành viên `INVITED`) (UJ-14). */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "từ chối lời mời của chính mình — điều kiện user_id + INVITED" },
  rateLimit: { scope: "session-invitation", limit: 30, windowMs: 60_000, per: "user" },
  handler: async ({ ctx, params }) => {
    await declineInvitation(ctx.userId, params.id ?? "")
    return jsonResponse({ data: { declined: true } })
  },
})
