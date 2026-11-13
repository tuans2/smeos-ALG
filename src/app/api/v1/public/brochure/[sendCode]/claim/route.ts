import { jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { claimBrochureSession, isHttps, serializeOwnerCookie } from "@/modules/greeting-card/use-cases/brochure-owner"
import { markBrochureOpened } from "@/modules/greeting-card/use-cases/get-greeting-catalog"
import { defineRoute } from "@/core/http/define-route"

/**
 * POST /api/v1/public/brochure/[sendCode]/claim — trình duyệt đầu tiên mở link nhận chủ phiên
 * (cookie HttpOnly) và báo "khách đã mở". Phiên đã có chủ khác → 404.
 */
export const POST = defineRoute({
  auth: { kind: "public" },
  rateLimit: { scope: "brochure-claim", limit: 30, windowMs: 60_000, per: "ip" },
  handler: async ({ request, params }) => {
    const { sendCode } = params as { sendCode: string }
    const cookie = await claimBrochureSession(request, sendCode)
    // Đã nhận chủ phiên thì luôn trả cookie, kể cả khi bước báo "đã mở" lỗi (link vừa hết hạn…)
    const opened = await markBrochureOpened(sendCode).catch(() => ({ opened: false }))
    return jsonResponse(opened, { headers: { "set-cookie": serializeOwnerCookie(cookie, isHttps(request)) } })
  },
})

export const dynamic = "force-dynamic"
