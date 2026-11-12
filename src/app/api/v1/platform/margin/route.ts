/** GET /api/v1/platform/margin?period=YYYY-MM (`N4`) — biên lợi nhuận nền tảng theo tháng và tổ chức, checklist ALG 10.4. */
import { jsonResponse } from "@/core/http/response"
import { getPlatformMargin } from "@/modules/platform/use-cases/platform-margin"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ request, pctx }) => {
    const period = new URL(request.url).searchParams.get("period") ?? undefined
    return jsonResponse({ data: await getPlatformMargin(pctx, period) })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
