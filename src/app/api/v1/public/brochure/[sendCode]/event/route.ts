import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { assertBrochureOwner } from "@/modules/greeting-card/use-cases/brochure-owner"
import { recordCustomerJourneyEvent } from "@/modules/greeting-card/use-cases/customer-journey"
import { brochureEventBody } from "@/app/api/v1/public/_contracts/requests"
import { defineRoute } from "@/core/http/define-route"

/** POST /api/v1/public/brochure/[sendCode]/event — trình duyệt của chủ phiên báo một bước lướt mẫu. */
export const POST = defineRoute({
  auth: { kind: "public" },
  rateLimit: { scope: "brochure-journey-event", limit: 240, windowMs: 10 * 60_000, per: "ip" },
  handler: async ({ request, params }) => {
    const { sendCode } = params as { sendCode: string }
    await assertBrochureOwner(request, sendCode)
    const parsed = brochureEventBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ event: "Sự kiện không hợp lệ" })
    return jsonResponse(await recordCustomerJourneyEvent(sendCode, parsed.data))
  },
})

export const dynamic = "force-dynamic"
