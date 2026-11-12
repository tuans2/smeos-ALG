import { jsonResponse } from "@/core/http/response"
import { downloadOptimization } from "@/modules/media/use-cases/download-optimization"
import { defineRoute } from "@/core/http/define-route"

/**
 * `GET /media/optimizations/:id/download` (`I3`, đặc tả 06 mục 8).
 *
 * Năng lực RIÊNG, không phải `I2`: tải ảnh về không phải là phê duyệt
 * (M04 mục 5.1). Trả URL ký sẵn có hạn, không stream byte qua route này.
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "I3" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const urlObj = new URL(request.url)
    const ratio = urlObj.searchParams.get("ratio") ?? undefined
    return jsonResponse(await downloadOptimization(ctx, id, ratio))
  },
})
