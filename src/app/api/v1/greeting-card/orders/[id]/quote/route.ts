import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { quoteBrochureOrder } from "@/modules/greeting-card/use-cases/confirm-brochure-payment"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { gcQuoteBody } from "@/app/api/v1/_contracts/requests-greeting-orders"
import { defineRoute } from "@/core/http/define-route"
import { camelKeys } from "@/lib/case-keys"

/** POST /api/v1/greeting-card/orders/[id]/quote — báo giá đơn đặt mẫu chưa niêm yết giá (R9). */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.paymentRecord },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const parsed = gcQuoteBody.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const input = camelKeys(parsed.data)
    return jsonResponse({ data: await quoteBrochureOrder(ctx, id, input.totalVnd, input.reason) })
  },
})
