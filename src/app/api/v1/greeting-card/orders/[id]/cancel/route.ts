import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { cancelBrochureOrder } from "@/modules/greeting-card/use-cases/confirm-brochure-payment"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { gcCancelBody } from "@/app/api/v1/_contracts/requests-greeting-orders"
import { defineRoute } from "@/core/http/define-route"

/** POST /api/v1/greeting-card/orders/[id]/cancel — huỷ đơn Thẻ chào (R6). */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.orderCancel },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const parsed = gcCancelBody.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    return jsonResponse({ data: await cancelBrochureOrder(ctx, id, parsed.data.reason, parsed.data.confirmInTransit === true) })
  },
})
