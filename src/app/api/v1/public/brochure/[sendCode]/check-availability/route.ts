import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { assertBrochureOwner } from "@/modules/greeting-card/use-cases/brochure-owner"
import { issuesToDetails } from "@/modules/greeting-card/contracts/public-order-schema"
import { checkPublicBrochureProductAvailability } from "@/modules/greeting-card/use-cases/check-product-availability"
import { brochureAvailabilityBody } from "@/app/api/v1/public/_contracts/requests"
import { defineRoute } from "@/core/http/define-route"

/**
 * POST /api/v1/public/brochure/[sendCode]/check-availability
 * Kiểm tra khả dụng phòng / sản phẩm real-time trên link chào gửi khách.
 */
export const POST = defineRoute({
  auth: { kind: "public" },
  rateLimit: { scope: "brochure-availability", limit: 120, windowMs: 60_000, per: "ip" },
  handler: async ({ request, params }) => {
    const { sendCode } = params as { sendCode: string }
    await assertBrochureOwner(request, sendCode)

    const parsed = brochureAvailabilityBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed(issuesToDetails(parsed.error.issues))

    const result = await checkPublicBrochureProductAvailability(sendCode, parsed.data)
    return jsonResponse(result)
  },
})

export const dynamic = "force-dynamic"
