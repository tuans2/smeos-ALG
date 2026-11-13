import { jsonResponse } from "@/core/http/response"
import { getIntegrationStatus } from "@/modules/greeting-card/use-cases/integration-status"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { defineRoute } from "@/core/http/define-route"

/** GET /api/v1/greeting-card/integrations — trạng thái tích hợp (không bao giờ trả khoá/bí mật). */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.orderRead },
  handler: async ({ ctx }) => {
    return jsonResponse({ data: await getIntegrationStatus(ctx) })
  },
})
