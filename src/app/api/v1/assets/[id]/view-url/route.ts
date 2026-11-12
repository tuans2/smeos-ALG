import { jsonResponse } from "@/core/http/response"
import { getAssetViewUrl } from "@/modules/assets/use-cases/get-asset-view-url"
import { defineRoute } from "@/core/http/define-route"

/**
 * `GET /api/v1/assets/:id/view-url` (`G1`) — trả URL ký sẵn để hiển thị một
 * asset đã lưu trong kho. Đích của việc "URL bàn giao chỉ mang định danh"
 * (`docs/dac-ta/FLORAOS_CREATIVE_STUDIO_IO_SPEC.md`): thay cho việc truyền
 * Data URL/blob qua query string hoặc `sessionStorage` (sự cố 22/09/2026).
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "G1" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    const result = await getAssetViewUrl(ctx, id)
    return jsonResponse({
      asset_id: result.assetId,
      url: result.url,
      expires_in: result.expiresInSeconds,
    })
  },
})
