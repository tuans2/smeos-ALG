import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { issuesToDetails, rejectBotSubmission } from "@/modules/greeting-card/contracts/public-order-schema"
import { submitProductInquiry } from "@/modules/greeting-card/use-cases/submit-product-inquiry"
import { greetingCatalogInquiryBody } from "@/app/api/v1/public/_contracts/requests"

/** POST /api/v1/public/greeting-catalog/[id]/inquiry — khách gửi yêu cầu tư vấn một mẫu. */
export const POST = handle<[{ params: Promise<{ id: string }> }]>(async (request, context) => {
  await enforceRateLimit(request, { scope: "greeting-catalog-inquiry", limit: 10, windowMs: 10 * 60_000 })
  const { id } = await context.params
  const parsed = greetingCatalogInquiryBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed(issuesToDetails(parsed.error.issues))
  rejectBotSubmission(parsed.data)
  const { website: _bot, ...input } = parsed.data
  const result = await submitProductInquiry(id, input)
  return jsonResponse(result, { status: 201 })
})

export const dynamic = "force-dynamic"
