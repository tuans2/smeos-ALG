/** POST /api/v1/integrations/connections/:id/test — kiểm tra kết nối ngay (W3). */

import { jsonResponse } from "@/core/http/response"
import { testConnection } from "@/modules/integration-hub/use-cases/manage-connection"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: testConnection" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    return jsonResponse({ connection: await testConnection(ctx, id) })
  },
})
