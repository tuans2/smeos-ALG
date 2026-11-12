import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { applyPriceBody } from "@/app/api/v1/_contracts/requests-costing"
import { applyPrice } from "@/modules/costing/use-cases/costing-service"
import { defineRoute } from "@/core/http/define-route"

/** `POST /costing/products/:productId/price` (`L3`) — áp giá bán đã chọn ở #34; ghi `audit_logs` cùng giao dịch. */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "L3" },
  handler: async ({ request, ctx, params }) => {
    const { productId } = params as { productId: string }
    const parsed = applyPriceBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    return jsonResponse({ data: await applyPrice(ctx, productId, parsed.data.price_vnd, parsed.data.scenario) })
  },
})
