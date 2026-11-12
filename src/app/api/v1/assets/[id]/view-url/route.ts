import { requireCapability } from "@/core/rbac/capabilities"
import { handle, jsonResponse } from "@/core/http/response"
import { getAssetViewUrl } from "@/modules/assets/use-cases/get-asset-view-url"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"

/**
 * `GET /api/v1/assets/:id/view-url` (`G1`) — trả URL ký sẵn để hiển thị một
 * asset đã lưu trong kho. Đích của việc "URL bàn giao chỉ mang định danh"
 * (`docs/dac-ta/ALG_CREATIVE_STUDIO_IO_SPEC.md`): thay cho việc truyền
 * Data URL/blob qua query string hoặc `sessionStorage` (sự cố 22/09/2026).
 */
export const GET = handle(async (request, context: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "G1")

  const { id } = await context.params
  const result = await getAssetViewUrl(ctx, id)
  return jsonResponse({
    asset_id: result.assetId,
    url: result.url,
    expires_in: result.expiresInSeconds,
  })
})
