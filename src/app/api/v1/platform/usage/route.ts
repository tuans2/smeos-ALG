/**
 * GET /api/v1/platform/usage (`N4`, P25a) — usage & chi phí gộp toàn hệ
 * thống. Xem đặc tả 06 mục 21.
 */
import { jsonResponse } from "@/core/http/response"
import { summarizeUsage } from "@/modules/platform/use-cases/summarize-usage"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ request, pctx }) => {
    const since = new URL(request.url).searchParams.get("since")
    return jsonResponse({
      data: await summarizeUsage(pctx, since ? { since: new Date(since) } : {}),
    })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
