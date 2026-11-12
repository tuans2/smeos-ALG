import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { requestDiscount } from "@/modules/greeting-card/use-cases/discount-requests"
import { discountRequestBody } from "@/app/api/v1/_contracts/requests-greeting-orders"
import { defineRoute } from "@/core/http/define-route"

/** POST /api/v1/greeting-card/orders/[id]/discount-request — sale xin giảm giá, gửi thẳng Điều hành. */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.manage },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const parsed = discountRequestBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const { reason, ...ask } = parsed.data
    return jsonResponse({ data: await requestDiscount(ctx, { orderId: id, ask, reason }) }, { status: 201 })
  },
})
