/** POST /api/v1/integrations/events/:id/replay — đưa sự kiện lỗi về hàng chờ xử lý lại (W5). */

import { jsonResponse } from "@/core/http/response"
import { replayEvent } from "@/modules/integration-hub/use-cases/connection-events"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: replayEvent" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    await replayEvent(ctx, id)
    return jsonResponse({ data: { id, replayed: true } })
  },
})
