/** DELETE /api/v1/integrations/connections/:id — ngắt kết nối, xoá khoá đã lưu (W2). */

import { jsonResponse } from "@/core/http/response"
import { disconnectConnection } from "@/modules/integration-hub/use-cases/manage-connection"
import { defineRoute } from "@/core/http/define-route"

export const DELETE = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: disconnectConnection" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    await disconnectConnection(ctx, id)
    return jsonResponse({ data: { id, disconnected: true } })
  },
})
