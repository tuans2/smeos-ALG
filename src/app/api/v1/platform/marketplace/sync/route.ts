/** POST /api/v1/platform/marketplace/sync — đồng bộ từ Google Sheet khảo sát (`N17`, ghi nhật ký nền tảng). */
import { jsonResponse } from "@/core/http/response"
import { syncMarketplaceFromSheet } from "@/modules/platform/use-cases/manage-partner-marketplace"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ pctx }) => {
    return jsonResponse({ data: await syncMarketplaceFromSheet(pctx) })
  },
})

export const dynamic = "force-dynamic"
