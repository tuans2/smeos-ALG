import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { refundBrochureOrder } from "@/modules/greeting-card/use-cases/confirm-brochure-payment"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { refundBody } from "@/app/api/v1/_contracts/requests-greeting-orders"
import { defineRoute } from "@/core/http/define-route"

/** POST /api/v1/greeting-card/orders/[id]/refund — ghi nhận hoàn tiền (R10). */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.paymentRefund },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const parsed = refundBody.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    return jsonResponse({ data: await refundBrochureOrder(ctx, id, parsed.data) })
  },
})
