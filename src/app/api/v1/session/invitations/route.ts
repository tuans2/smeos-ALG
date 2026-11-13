import { defineRoute } from "@/core/http/define-route"
import { jsonResponse } from "@/core/http/response"
import { listMyInvitations } from "@/modules/organization/use-cases/manage-invitations"

/** `GET /session/invitations` — lời mời vào tổ chức khác của chính người đang đăng nhập (UJ-14). */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "lời mời của chính người đang đăng nhập — lọc theo user_id của phiên" },
  handler: async ({ ctx }) => {
    const rows = await listMyInvitations(ctx.userId)
    return jsonResponse({
      data: rows.map((r) => ({
        membership_id: r.membershipId,
        organization_id: r.organizationId,
        organization_name: r.organizationName,
        role_name: r.roleName,
        invited_at: r.invitedAt.toISOString(),
      })),
    })
  },
})
