import { jsonResponse } from "@/core/http/response"
import { disablePaymentWebhook, rotatePaymentWebhookKey } from "@/modules/greeting-card/use-cases/payment-webhook"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { defineRoute } from "@/core/http/define-route"

/** POST — sinh khoá webhook SePay mới (trả khoá MỘT lần; khoá cũ hết hiệu lực). */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.integrationManage },
  handler: async ({ ctx }) => {
    return jsonResponse({ data: await rotatePaymentWebhookKey(ctx) }, { status: 201 })
  },
})

/** DELETE — tắt đối soát tự động. */
export const DELETE = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.integrationManage },
  handler: async ({ ctx }) => {
    return jsonResponse({ data: await disablePaymentWebhook(ctx) })
  },
})
