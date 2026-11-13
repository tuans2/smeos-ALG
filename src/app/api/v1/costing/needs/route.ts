import { jsonResponse } from "@/core/http/response"
import { materialNeeds } from "@/modules/costing/use-cases/costing-service"
import { defineRoute } from "@/core/http/define-route"

/** `GET /costing/needs?from=YYYY-MM-DD&to=YYYY-MM-DD` (`L5`) — dự toán mua nguyên liệu cho đơn giao trong khoảng (#35). */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "L5" },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    return jsonResponse({ data: await materialNeeds(ctx, url.searchParams.get("from") ?? "", url.searchParams.get("to") ?? "") })
  },
})
