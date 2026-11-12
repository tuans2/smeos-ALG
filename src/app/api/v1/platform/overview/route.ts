/** GET /api/v1/platform/overview (`N1`; phần sức khoẻ cần `N5`) — tổng quan Console, checklist ALG 9.8. */
import { jsonResponse } from "@/core/http/response"
import { getPlatformOverview } from "@/modules/platform/use-cases/platform-overview"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ pctx }) => {
    return jsonResponse({ data: await getPlatformOverview(pctx) })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
