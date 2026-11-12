/** GET /api/v1/reports/revenue?from=YYYY-MM-DD&to=YYYY-MM-DD&granularity=day|week|month (`R20`) — doanh thu dự kiến và thực thu theo kỳ, ?detail=orders mở danh sách đơn (6.2). */
import { jsonResponse } from "@/core/http/response"
import { getRevenueReport } from "@/modules/reporting/use-cases/reports"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "R20 kiểm ở use-case (getRevenueReport → periodOrThrow)" },
  handler: async ({ request, ctx }) => {
    const q = new URL(request.url).searchParams
    return jsonResponse({ data: await getRevenueReport(ctx, { from: q.get("from"), to: q.get("to"), granularity: q.get("granularity"), detail: q.get("detail") }) })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
