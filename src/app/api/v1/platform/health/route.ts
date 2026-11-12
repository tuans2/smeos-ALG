/**
 * GET /api/v1/platform/health (`N5`, P25a) — chỉ đọc + cảnh báo (D-N5),
 * không nút hành động. Xem đặc tả 06 mục 21.
 */
import { jsonResponse } from "@/core/http/response"
import { readSystemHealth } from "@/modules/platform/use-cases/read-system-health"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ pctx }) => {
    return jsonResponse({ data: await readSystemHealth(pctx) })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
