import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { issuesToDetails, rejectBotSubmission } from "@/modules/greeting-card/contracts/public-order-schema"
import { submitBrochureInquiry } from "@/modules/greeting-card/use-cases/submit-product-inquiry"
import { assertBrochureOwner } from "@/modules/greeting-card/use-cases/brochure-owner"
import { brochureInquiryBody } from "@/app/api/v1/public/_contracts/requests"
import { defineRoute } from "@/core/http/define-route"

/** POST /api/v1/public/brochure/[sendCode]/inquiry — khách ở link chào riêng gửi yêu cầu tư vấn một mẫu. */
export const POST = defineRoute({
  auth: { kind: "public" },
  rateLimit: { scope: "brochure-inquiry", limit: 10, windowMs: 10 * 60_000, per: "ip" },
  handler: async ({ request, params }) => {
    const { sendCode } = params as { sendCode: string }
    await assertBrochureOwner(request, sendCode)
    const parsed = brochureInquiryBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed(issuesToDetails(parsed.error.issues))
    rejectBotSubmission(parsed.data)
    const { website: _bot, ...input } = parsed.data
    const result = await submitBrochureInquiry(sendCode, input)
    return jsonResponse(result, { status: 201 })
  },
})

export const dynamic = "force-dynamic"
