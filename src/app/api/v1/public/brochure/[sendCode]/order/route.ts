import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { assertBrochureOwner } from "@/modules/greeting-card/use-cases/brochure-owner"
import { issuesToDetails, publicOrderBodySchema, rejectBotSubmission } from "@/modules/greeting-card/contracts/public-order-schema"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { defineRoute } from "@/core/http/define-route"

/** POST /api/v1/public/brochure/[sendCode]/order — khách gửi đơn đặt hoa. */
export const POST = defineRoute({
  auth: { kind: "public" },
  rateLimit: { scope: "brochure-order", limit: 10, windowMs: 10 * 60_000, per: "ip" },
  handler: async ({ request, params }) => {
    const { sendCode } = params as { sendCode: string }
    await assertBrochureOwner(request, sendCode)
    const parsed = publicOrderBodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed(issuesToDetails(parsed.error.issues))
    rejectBotSubmission(parsed.data)
    const result = await submitBrochureOrder(sendCode, parsed.data)
    return jsonResponse(result, { status: 201 })
  },
})

export const dynamic = "force-dynamic"
