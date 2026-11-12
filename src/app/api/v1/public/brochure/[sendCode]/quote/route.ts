import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { assertBrochureOwner } from "@/modules/greeting-card/use-cases/brochure-owner"
import { issuesToDetails, publicQuoteBodySchema } from "@/modules/greeting-card/contracts/public-order-schema"
import { quoteBrochureSession } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { defineRoute } from "@/core/http/define-route"

/** POST /api/v1/public/brochure/[sendCode]/quote — báo giá theo size/số lượng/khu vực/mã giảm giá. */
export const POST = defineRoute({
  auth: { kind: "public" },
  rateLimit: { scope: "brochure-quote", limit: 60, windowMs: 60_000, per: "ip" },
  handler: async ({ request, params }) => {
    const { sendCode } = params as { sendCode: string }
    await assertBrochureOwner(request, sendCode)
    const parsed = publicQuoteBodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed(issuesToDetails(parsed.error.issues))
    const { quote, errors, fullSlots } = await quoteBrochureSession(sendCode, parsed.data)
    return jsonResponse({ quote, errors, fullSlots: fullSlots ?? [] })
  },
})

export const dynamic = "force-dynamic"
