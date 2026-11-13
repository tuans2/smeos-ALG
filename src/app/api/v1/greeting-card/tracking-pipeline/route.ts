import { jsonResponse } from "@/core/http/response"
import { getTrackingPipeline } from "@/modules/greeting-card/use-cases/get-tracking-pipeline"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { defineRoute } from "@/core/http/define-route"

/** GET /api/v1/greeting-card/tracking-pipeline — quy trình theo dõi (trao đổi nội bộ ở `/greeting-card/messages`). */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.orderRead },
  handler: async ({ ctx }) => {
    const pipeline = await getTrackingPipeline(ctx)
    return jsonResponse({ data: pipeline })
  },
})
