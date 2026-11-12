/** GET /api/v1/reports/products?from=YYYY-MM-DD&to=YYYY-MM-DD&granularity=day|week|month (`R20`) — xếp hạng mẫu, tỷ trọng màu và phong cách (6.3). */
import { jsonResponse } from "@/core/http/response"
import { getProductReport } from "@/modules/reporting/use-cases/reports"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: getProductReport" },
  handler: async ({ request, ctx }) => {
    const q = new URL(request.url).searchParams
    return jsonResponse({ data: await getProductReport(ctx, { from: q.get("from"), to: q.get("to"), granularity: q.get("granularity"), detail: q.get("detail") }) })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
