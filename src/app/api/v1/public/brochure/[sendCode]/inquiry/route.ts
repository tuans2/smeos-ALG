import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { issuesToDetails, rejectBotSubmission } from "@/modules/greeting-card/contracts/public-order-schema"
import { submitBrochureInquiry } from "@/modules/greeting-card/use-cases/submit-product-inquiry"
import { assertBrochureOwner } from "@/modules/greeting-card/use-cases/brochure-owner"
import { brochureInquiryBody } from "@/app/api/v1/public/_contracts/requests"

/** POST /api/v1/public/brochure/[sendCode]/inquiry — khách ở link chào riêng gửi yêu cầu tư vấn một mẫu. */
export const POST = handle<[{ params: Promise<{ sendCode: string }> }]>(async (request, context) => {
  await enforceRateLimit(request, { scope: "brochure-inquiry", limit: 10, windowMs: 10 * 60_000 })
  const { sendCode } = await context.params
  await assertBrochureOwner(request, sendCode)
  const parsed = brochureInquiryBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed(issuesToDetails(parsed.error.issues))
  rejectBotSubmission(parsed.data)
  const { website: _bot, ...input } = parsed.data
  const result = await submitBrochureInquiry(sendCode, input)
  return jsonResponse(result, { status: 201 })
})

export const dynamic = "force-dynamic"
