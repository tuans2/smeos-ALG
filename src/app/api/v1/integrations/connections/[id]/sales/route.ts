/** GET /api/v1/integrations/connections/:id/sales — tin đăng và đơn gần đây của một kết nối kênh bán (W1). */

import { jsonResponse } from "@/core/http/response"
import { getSalesChannel } from "@/modules/integration-hub/use-cases/sales-channel"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: getSalesChannel" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    return jsonResponse(await getSalesChannel(ctx, id))
  },
})
