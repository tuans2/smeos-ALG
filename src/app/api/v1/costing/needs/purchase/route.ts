import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { recordPurchaseBody } from "@/app/api/v1/_contracts/requests-costing"
import { recordPurchase } from "@/modules/costing/use-cases/costing-service"
import { defineRoute } from "@/core/http/define-route"

/** `POST /costing/needs/purchase` (`L6`) — đánh dấu "đã mua" từ dự toán (#35): cộng tồn, ghi giá mua thực tế. */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "L6" },
  handler: async ({ request, ctx }) => {
    const parsed = recordPurchaseBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const items = parsed.data.items.map((i) => ({ materialId: i.material_id, quantity: i.quantity, unitCostVnd: i.unit_cost_vnd ?? null }))
    return jsonResponse({ data: await recordPurchase(ctx, items) })
  },
})
