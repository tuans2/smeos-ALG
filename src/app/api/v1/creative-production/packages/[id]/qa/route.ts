import { jsonResponse } from "@/core/http/response"
import { runCampaignQa } from "@/modules/creative-production/use-cases/manage-campaign-package"
import { defineRoute } from "@/core/http/define-route"

/**
 * `POST /api/v1/creative-production/packages/:id/qa` (`I1`) — Chặng 08: chạy
 * năm trục kiểm định trên dữ liệu thật phía máy chủ (`evaluateCampaignQa`).
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    return jsonResponse(await runCampaignQa(ctx, id))
  },
})
