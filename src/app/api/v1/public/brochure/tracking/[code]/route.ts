import { notFound, validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { isBrochureOwner } from "@/modules/greeting-card/use-cases/brochure-owner"
import { getBrochureTracking } from "@/modules/greeting-card/use-cases/get-brochure-tracking"
import { trackingVerifyBody } from "@/app/api/v1/public/_contracts/requests"

/**
 * GET /api/v1/public/brochure/tracking/[code] — khách theo dõi đơn theo mã đơn.
 * Mặc định trả bản rút gọn; `?link=<mã link>` kèm cookie chủ phiên của link đó trả đầy đủ.
 */
export const GET = handle<[{ params: Promise<{ code: string }> }]>(async (request, context) => {
  await enforceRateLimit(request, { scope: "brochure-tracking", limit: 60, windowMs: 60_000 })
  const { code } = await context.params
  const link = new URL(request.url).searchParams.get("link")
  // Bản đầy đủ chỉ cho chủ phiên — người nhận link chuyển tiếp chỉ thấy bản rút gọn
  const owned = link && isBrochureOwner(request, link) ? link : null
  const data = await getBrochureTracking(code, { sendCode: owned })
  if (data.status === "NOT_FOUND") throw notFound()
  return jsonResponse(data)
})

/**
 * POST /api/v1/public/brochure/tracking/[code] — `{ phoneLast4 }`: 4 số cuối SĐT người đặt.
 * Sai → 404 (không nói là sai số hay sai mã). Giới hạn chặt để không dò được 10.000 khả năng.
 */
export const POST = handle<[{ params: Promise<{ code: string }> }]>(async (request, context) => {
  const { code } = await context.params
  const codeKey = code.toUpperCase().slice(0, 40)
  await enforceRateLimit(request, { scope: `brochure-tracking-verify:${codeKey}`, limit: 5, windowMs: 15 * 60_000 })
  // Trần CHUNG mọi IP cho từng mã đơn: đổi IP không dò được đủ 10.000 khả năng của 4 số cuối
  await enforceRateLimit(request, { scope: `brochure-tracking-verify-code:${codeKey}`, limit: 10, windowMs: 86_400_000, key: "global" })
  const parsed = trackingVerifyBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ phoneLast4: "Nhập đúng 4 số cuối" })
  const data = await getBrochureTracking(code, { phoneLast4: parsed.data.phoneLast4 })
  if (data.status === "NOT_FOUND" || !data.order.verified) throw notFound()
  return jsonResponse(data)
})

export const dynamic = "force-dynamic"
