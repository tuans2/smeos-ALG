import { jsonResponse } from "@/core/http/response"
import { getCampaignPerformance } from "@/modules/creative-production/use-cases/get-campaign-performance"
import { defineRoute } from "@/core/http/define-route"

/**
 * `GET /api/v1/creative-production/packages/:id/performance` (`R1` order.read) —
 * Chặng 11–14 tính trên dữ liệu thật của tổ chức; chưa đủ dữ liệu thì nói rõ.
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "R1" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    return jsonResponse(await getCampaignPerformance(ctx, id))
  },
})
