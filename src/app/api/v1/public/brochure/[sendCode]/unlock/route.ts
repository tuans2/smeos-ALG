import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { isHttps, serializeOwnerCookie, unlockBrochureSession } from "@/modules/greeting-card/use-cases/brochure-owner"
import { brochureUnlockBody } from "@/app/api/v1/public/_contracts/requests"

/**
 * POST /api/v1/public/brochure/[sendCode]/unlock — `{ phoneLast4 }`: mở lại link riêng đã có đơn ở
 * trình duyệt khác bằng 4 số cuối SĐT người đặt (PO 08/10/2026). Đúng → cookie chủ phiên; sai/chưa có
 * đơn → 404. Giới hạn theo IP × mã và trần chung mỗi mã để không dò được 10.000 khả năng.
 */
export const POST = handle<[{ params: Promise<{ sendCode: string }> }]>(async (request, context) => {
  const { sendCode } = await context.params
  const key = sendCode.toUpperCase().slice(0, 40)
  await enforceRateLimit(request, { scope: `brochure-unlock:${key}`, limit: 5, windowMs: 15 * 60_000 })
  await enforceRateLimit(request, { scope: `brochure-unlock-code:${key}`, limit: 10, windowMs: 86_400_000, key: "global" })
  const parsed = brochureUnlockBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ phoneLast4: "Nhập đúng 4 số cuối số điện thoại" })
  const cookie = await unlockBrochureSession(sendCode, parsed.data.phoneLast4)
  return jsonResponse({ unlocked: true }, { headers: { "set-cookie": serializeOwnerCookie(cookie, isHttps(request)) } })
})

export const dynamic = "force-dynamic"
