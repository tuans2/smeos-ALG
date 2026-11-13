import { jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { assertBrochureOwner } from "@/modules/greeting-card/use-cases/brochure-owner"
import { reportCustomerPayment } from "@/modules/greeting-card/use-cases/confirm-brochure-payment"
import { defineRoute } from "@/core/http/define-route"

/** POST /api/v1/public/brochure/[sendCode]/payment-notify — khách báo đã chuyển khoản. */
export const POST = defineRoute({
  auth: { kind: "public" },
  rateLimit: { scope: "brochure-paid", limit: 10, windowMs: 60_000, per: "ip" },
  handler: async ({ request, params }) => {
    const { sendCode } = params as { sendCode: string }
    await assertBrochureOwner(request, sendCode)
    const body = (await request.json().catch(() => ({}))) as { proofAssetId?: string }
    return jsonResponse(await reportCustomerPayment(sendCode, { proofAssetId: body.proofAssetId }))
  },
})

export const dynamic = "force-dynamic"
