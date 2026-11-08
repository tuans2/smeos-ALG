import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { issuesToDetails } from "@/modules/greeting-card/contracts/public-order-schema"
import { respondFlowerSubstitute } from "@/modules/greeting-card/use-cases/flower-substitute"
import { flowerSubstituteAnswerBody } from "@/app/api/v1/public/_contracts/requests"

/**
 * POST /api/v1/public/brochure/tracking/[code]/flower-substitute-response?link=<mã link>
 * Người đặt đồng ý / không đồng ý đổi một loại hoa phụ (checklist ALG 5.14). Chỉ chủ phiên của link
 * đơn, hoặc người nhập đúng 4 số cuối SĐT người đặt; khác → 404.
 */
export const POST = handle<[{ params: Promise<{ code: string }> }]>(async (request, context) => {
  const { code } = await context.params
  const codeKey = code.toUpperCase().slice(0, 40)
  await enforceRateLimit(request, { scope: "brochure-substitute-response", limit: 10, windowMs: 10 * 60_000 })
  const parsed = flowerSubstituteAnswerBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed(issuesToDetails(parsed.error.issues))
  const { phoneLast4, ...input } = parsed.data
  if (phoneLast4) {
    // Dùng chung bộ đếm với ô xác minh của trang theo dõi — không mở thêm đường dò 4 số cuối
    await enforceRateLimit(request, { scope: `brochure-tracking-verify:${codeKey}`, limit: 5, windowMs: 15 * 60_000 })
    await enforceRateLimit(request, { scope: `brochure-tracking-verify-code:${codeKey}`, limit: 10, windowMs: 86_400_000, key: "global" })
  }
  const link = new URL(request.url).searchParams.get("link")
  return jsonResponse({ data: await respondFlowerSubstitute(request, code, { sendCode: link, phoneLast4 }, input) })
})

export const dynamic = "force-dynamic"
