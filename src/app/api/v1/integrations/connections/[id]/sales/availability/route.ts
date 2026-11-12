/** POST /api/v1/integrations/connections/:id/sales/availability — đẩy còn/hết hàng cho mọi tin đã đăng (W3). */

import { jsonResponse } from "@/core/http/response"
import { syncAvailability } from "@/modules/integration-hub/use-cases/sales-channel"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: syncAvailability" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    return jsonResponse({ updated: await syncAvailability(ctx, id) })
  },
})
