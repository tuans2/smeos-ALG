import { jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { assertBrochureOwner } from "@/modules/greeting-card/use-cases/brochure-owner"
import { markBrochureOpened } from "@/modules/greeting-card/use-cases/get-greeting-catalog"
import { defineRoute } from "@/core/http/define-route"

/**
 * POST /api/v1/public/brochure/[sendCode]/open — trình duyệt của khách báo đã mở link.
 * Tách khỏi lúc dựng trang để máy quét xem trước (Zalo/Facebook) không bị tính là khách mở.
 */
export const POST = defineRoute({
  auth: { kind: "public" },
  rateLimit: { scope: "brochure-open", limit: 30, windowMs: 60_000, per: "ip" },
  handler: async ({ request, params }) => {
    const { sendCode } = params as { sendCode: string }
    await assertBrochureOwner(request, sendCode)
    return jsonResponse(await markBrochureOpened(sendCode))
  },
})

export const dynamic = "force-dynamic"
