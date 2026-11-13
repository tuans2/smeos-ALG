import { jsonResponse } from "@/core/http/response"
import { rotateIntegrationToken } from "@/modules/integration/use-cases/rotate-integration-token"
import { defineRoute } from "@/core/http/define-route"

/**
 * `POST /integration-tokens/:id/rotate` (`F9`) — cấp token mới, KHÔNG thu
 * hồi token cũ (đặc tả 08 mục 3: hai token cùng lúc trong thời gian xoay).
 * Thu hồi token cũ là một lời gọi riêng: `DELETE /integration-tokens/:id`.
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "F9" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    const result = await rotateIntegrationToken(ctx, id)
    return jsonResponse(result, { status: 201 })
  },
})
