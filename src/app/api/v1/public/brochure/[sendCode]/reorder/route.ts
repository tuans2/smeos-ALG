import { jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { assertBrochureOwner, isHttps, serializeOwnerCookie } from "@/modules/greeting-card/use-cases/brochure-owner"
import { startAnotherOrder } from "@/modules/greeting-card/use-cases/start-another-order"
import { defineRoute } from "@/core/http/define-route"

/** POST /api/v1/public/brochure/[sendCode]/reorder — khách đặt thêm đơn mới từ link đã có đơn. */
export const POST = defineRoute({
  auth: { kind: "public" },
  rateLimit: { scope: "brochure-reorder", limit: 10, windowMs: 10 * 60_000, per: "ip" },
  handler: async ({ request, params }) => {
    const { sendCode } = params as { sendCode: string }
    await assertBrochureOwner(request, sendCode)
    const { sendCode: next, ownerCookie } = await startAnotherOrder(sendCode)
    return jsonResponse({ sendCode: next }, { status: 201, headers: { "set-cookie": serializeOwnerCookie(ownerCookie, isHttps(request)) } })
  },
})

export const dynamic = "force-dynamic"
