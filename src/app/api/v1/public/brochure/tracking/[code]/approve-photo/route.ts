import { jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { approveBrochurePhoto } from "@/modules/greeting-card/use-cases/approve-brochure-photo"
import { defineRoute } from "@/core/http/define-route"

/**
 * POST /api/v1/public/brochure/tracking/[code]/approve-photo?link=<mã link>
 * Khách (chủ phiên của link) bấm xác nhận hình ảnh sản phẩm hoàn thiện (Spec #3).
 */
export const POST = defineRoute({
  auth: { kind: "public" },
  rateLimit: { scope: "brochure-photo-approve", limit: 10, windowMs: 60_000, per: "ip" },
  handler: async ({ request, params }) => {
    const { code } = params as { code: string }
    const link = new URL(request.url).searchParams.get("link")
    await approveBrochurePhoto(request, code, link)
    return jsonResponse({ success: true, message: "Đã xác nhận hình ảnh sản phẩm thành công" })
  },
})

export const dynamic = "force-dynamic"
