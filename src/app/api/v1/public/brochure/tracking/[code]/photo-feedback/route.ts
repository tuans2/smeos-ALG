import { defineRoute } from "@/core/http/define-route"
import { jsonResponse } from "@/core/http/response"
import { photoFeedbackBody } from "@/app/api/v1/public/_contracts/requests"
import { sendBrochurePhotoFeedback } from "@/modules/greeting-card/use-cases/send-photo-feedback"

/**
 * POST /api/v1/public/brochure/tracking/[code]/photo-feedback?link=<mã link>
 * Khách (chủ phiên của link) góp ý ảnh thành phẩm thay vì đồng ý (checklist ALG 5.13).
 */
export const POST = defineRoute({
  auth: { kind: "public" },
  rateLimit: { scope: "brochure-photo-feedback", limit: 10, windowMs: 10 * 60_000, per: "ip" },
  body: photoFeedbackBody,
  handler: async ({ request, params, body }) => {
    const link = new URL(request.url).searchParams.get("link")
    return jsonResponse({ data: await sendBrochurePhotoFeedback(request, params.code ?? "", link, body.message) }, { status: 201 })
  },
})

export const dynamic = "force-dynamic"
