/**
 * POST /api/v1/platform/marketplace/sync-photos — tải một lượt ảnh khảo sát từ Drive vào kho
 * (`N17`). Mỗi lượt xử lý tối đa PHOTO_STORES_PER_RUN cửa hàng; `remaining` > 0 thì gọi tiếp.
 */
import { jsonResponse } from "@/core/http/response"
import { syncMarketplacePhotos } from "@/modules/platform/use-cases/manage-partner-marketplace"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ pctx }) => {
    return jsonResponse({ data: await syncMarketplacePhotos(pctx) })
  },
})

export const dynamic = "force-dynamic"
