/**
 * GET /api/v1/platform/orgs-data
 *
 * Platform Admin: Lấy tóm tắt dữ liệu của tất cả tổ chức đăng ký.
 * Yêu cầu PlatformContext với capability N1.
 */

import { jsonResponse } from "@/core/http/response"
import { getPlatformOrgsData } from "@/modules/platform/use-cases/get-platform-orgs-data"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ pctx }) => {
    const result = await getPlatformOrgsData(pctx)
    return jsonResponse({ data: result })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
