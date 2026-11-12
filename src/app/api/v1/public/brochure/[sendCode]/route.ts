import { notFound } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { assertBrochureOwner } from "@/modules/greeting-card/use-cases/brochure-owner"
import { getGreetingCatalogForCustomer } from "@/modules/greeting-card/use-cases/get-greeting-catalog"
import { defineRoute } from "@/core/http/define-route"

/** GET /api/v1/public/brochure/[sendCode] — công khai, không cần đăng nhập. */
export const GET = defineRoute({
  auth: { kind: "public" },
  rateLimit: { scope: "brochure-view", limit: 120, windowMs: 60_000, per: "ip" },
  handler: async ({ request, params }) => {
    const { sendCode } = params as { sendCode: string }
    await assertBrochureOwner(request, sendCode)
    const data = await getGreetingCatalogForCustomer(sendCode)
    if (data.status !== "ACTIVE") throw notFound()
    return jsonResponse(data)
  },
})

export const dynamic = "force-dynamic"
