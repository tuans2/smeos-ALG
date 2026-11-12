import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { assertBrochureOwner } from "@/modules/greeting-card/use-cases/brochure-owner"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { brochureSelectBody } from "@/app/api/v1/public/_contracts/requests"
import { defineRoute } from "@/core/http/define-route"

// Chỉ nhận productId — mọi field khác (giá, tên, ảnh) khách gửi lên đều bị bỏ qua.

/** POST /api/v1/public/brochure/[sendCode]/select */
export const POST = defineRoute({
  auth: { kind: "public" },
  rateLimit: { scope: "brochure-select", limit: 30, windowMs: 60_000, per: "ip" },
  handler: async ({ request, params }) => {
    const { sendCode } = params as { sendCode: string }
    await assertBrochureOwner(request, sendCode)
    const parsed = brochureSelectBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ productId: "Thiếu thông tin sản phẩm" })
    const snapshot = await selectBrochureProduct(sendCode, parsed.data.productId)
    return jsonResponse({ success: true, snapshot })
  },
})

export const dynamic = "force-dynamic"
