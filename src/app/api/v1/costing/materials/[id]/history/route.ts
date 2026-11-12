import { jsonResponse } from "@/core/http/response"
import { materialHistory } from "@/modules/costing/use-cases/costing-service"
import { defineRoute } from "@/core/http/define-route"

/** `GET /costing/materials/:id/history` (`L5`) — lịch sử đơn giá, mới nhất trước. */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "L5" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    return jsonResponse({ data: await materialHistory(ctx, id) })
  },
})
