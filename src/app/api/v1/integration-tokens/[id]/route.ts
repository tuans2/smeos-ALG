import { jsonResponse } from "@/core/http/response"
import { revokeIntegrationToken } from "@/modules/integration/use-cases/revoke-integration-token"
import { defineRoute } from "@/core/http/define-route"

/** `DELETE /integration-tokens/:id` (`F9`) — thu hồi ngay, không xoá bản ghi. */
export const DELETE = defineRoute({
  auth: { kind: "tenant", capability: "F9" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    await revokeIntegrationToken(ctx, id)
    return jsonResponse({ data: { id, revoked: true } })
  },
})
