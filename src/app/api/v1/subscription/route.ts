/** GET /api/v1/subscription (`D1`) — gói thuê bao và hoá đơn của cửa hàng, checklist ALG 10.7. */
import { jsonResponse } from "@/core/http/response"
import { getMySubscription } from "@/modules/subscription/use-cases/get-my-subscription"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: getMySubscription" },
  handler: async ({ ctx }) => {
    return jsonResponse({ data: await getMySubscription(ctx) })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
