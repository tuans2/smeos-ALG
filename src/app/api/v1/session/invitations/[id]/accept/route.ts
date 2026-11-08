import { defineRoute } from "@/core/http/define-route"
import { jsonResponse } from "@/core/http/response"
import { acceptInvitation } from "@/modules/organization/use-cases/manage-invitations"

/**
 * `POST /session/invitations/:id/accept` — nhận lời mời của chính mình → thành viên đang hoạt động (UJ-14).
 * Không đổi tổ chức đang hoạt động của phiên; chuyển sang bằng `POST /session/organization`.
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "nhận lời mời của chính mình — điều kiện user_id + INVITED" },
  rateLimit: { scope: "session-invitation", limit: 30, windowMs: 60_000, per: "user" },
  handler: async ({ ctx, params }) =>
    jsonResponse({ data: await acceptInvitation(ctx.userId, params.id ?? "").then((r) => ({ organization_id: r.organizationId })) }),
})
