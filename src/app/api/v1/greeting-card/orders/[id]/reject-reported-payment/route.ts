import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { rejectReportedPayment } from "@/modules/greeting-card/use-cases/reject-reported-payment"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { rejectReportedPaymentBody } from "@/app/api/v1/_contracts/requests-greeting-orders"
import { defineRoute } from "@/core/http/define-route"

/** Điều hành cảnh báo "Chưa nhận được tiền" cho khoản khách đã báo chuyển. */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.paymentRecord },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }

    const parsed = rejectReportedPaymentBody.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const result = await rejectReportedPayment(ctx, id, { reason: parsed.data.reason })
    return jsonResponse({ data: result })
  },
})
