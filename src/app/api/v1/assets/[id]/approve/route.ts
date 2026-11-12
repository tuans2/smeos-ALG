import { jsonResponse } from "@/core/http/response"
import { approveAsset } from "@/modules/assets/use-cases/approve-asset"
import { defineRoute } from "@/core/http/define-route"

/**
 * `POST /api/v1/assets/:id/approve` (`I2`)
 * Duyệt một asset (Master Image hoặc Biến thể Marketing M04b).
 * Gác quyền `I2` (trần cứng dieu_hanh).
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "I2" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    const asset = await approveAsset(ctx, id)
    return jsonResponse({ asset })
  },
})
