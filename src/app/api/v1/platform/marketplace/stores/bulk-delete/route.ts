/**
 * POST /api/v1/platform/marketplace/stores/bulk-delete — xoá hàng loạt hồ sơ chợ đối tác (`N18`, chỉ superadmin).
 * Body `{ ids: string[] }` (1–500 hồ sơ đã chọn) hoặc `{ all: true, expectedTotal }` (toàn bộ, phải khớp số hồ sơ hiện có).
 */
import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { deleteMarketplaceStores } from "@/modules/platform/use-cases/delete-partner-marketplace-store"
import { requirePlatformContext } from "@/modules/platform/use-cases/resolve-platform-session"
import { bulkDeleteStoresBody } from "@/app/api/v1/platform/_contracts/requests"

export const POST = handle(async (request) => {
  const pctx = await requirePlatformContext(request)
  const parsed = bulkDeleteStoresBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ body: "Yêu cầu xoá không hợp lệ" })
  return jsonResponse({ data: await deleteMarketplaceStores(pctx, parsed.data) })
})

export const dynamic = "force-dynamic"
