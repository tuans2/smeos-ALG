/** GET /api/v1/reports/orders?from=YYYY-MM-DD&to=YYYY-MM-DD&granularity=day|week|month (`R20`) — số đơn theo kỳ, tỷ lệ hoàn tất, huỷ, trễ (6.1). */
import { jsonResponse } from "@/core/http/response"
import { getOrderReport } from "@/modules/reporting/use-cases/reports"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "R20 kiểm ở use-case (getOrderReport → periodOrThrow)" },
  handler: async ({ request, ctx }) => {
    const q = new URL(request.url).searchParams
    return jsonResponse({ data: await getOrderReport(ctx, { from: q.get("from"), to: q.get("to"), granularity: q.get("granularity"), detail: q.get("detail") }) })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
