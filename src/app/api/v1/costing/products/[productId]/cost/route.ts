import { jsonResponse } from "@/core/http/response"
import { productCostAndPrice } from "@/modules/costing/use-cases/costing-service"
import { defineRoute } from "@/core/http/define-route"

/** `GET /costing/products/:productId/cost` (`L5`) — giá vốn (#33) và kịch bản giá bán (#34). `?competitor_vnd=` tuỳ chọn. */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "L5" },
  handler: async ({ request, ctx, params }) => {
    const { productId } = params as { productId: string }
    const raw = Number(new URL(request.url).searchParams.get("competitor_vnd"))
    return jsonResponse({ data: await productCostAndPrice(ctx, productId, Number.isFinite(raw) && raw > 0 ? raw : null) })
  },
})
