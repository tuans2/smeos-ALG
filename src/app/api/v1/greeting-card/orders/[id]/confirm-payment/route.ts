import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { adminConfirmBrochurePayment } from "@/modules/greeting-card/use-cases/confirm-brochure-payment"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { dispatchAfterPaymentConfirmed } from "@/modules/greeting-card/use-cases/dispatch-after-payment"
import { confirmPaymentBody } from "@/app/api/v1/_contracts/requests-greeting-orders"
import { defineRoute } from "@/core/http/define-route"
import { camelKeys } from "@/lib/case-keys"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.paymentRecord },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }

    const body = await request.json().catch(() => ({}))
    const parsed = confirmPaymentBody.safeParse(body)
    if (!parsed.success) {
      throw validationFailed({ issues: parsed.error.issues })
    }
    const input = camelKeys(parsed.data)

    const result = await adminConfirmBrochurePayment(ctx, id, {
      amountVnd: input.amountVnd,
      reference: input.reference,
      note: input.note,
    })
    // Chuỗi: tiền đã ghi nhận → chọn cửa hàng gia công theo cài đặt; đơn đã mời rồi thì không phát lại
    const dispatch = await dispatchAfterPaymentConfirmed(ctx, id, { manualDispatch: input.manualDispatch })
    return jsonResponse({ data: { ...result, dispatch } })
  },
})
