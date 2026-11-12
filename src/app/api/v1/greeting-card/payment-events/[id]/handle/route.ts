import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { markPaymentEventHandled } from "@/modules/greeting-card/use-cases/payment-webhook"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { paymentEventHandleBody } from "@/app/api/v1/_contracts/requests-greeting"
import { defineRoute } from "@/core/http/define-route"

/** POST /api/v1/greeting-card/payment-events/[id]/handle — đánh dấu đã xử lý tay. */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.paymentRecord },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const parsed = paymentEventHandleBody.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    return jsonResponse({ data: await markPaymentEventHandled(ctx, id, parsed.data.note) })
  },
})
