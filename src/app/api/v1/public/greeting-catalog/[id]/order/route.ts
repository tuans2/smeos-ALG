import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { issuesToDetails, rejectBotSubmission } from "@/modules/greeting-card/contracts/public-order-schema"
import { submitPublicCatalogOrder } from "@/modules/greeting-card/use-cases/submit-public-catalog-order"
import { recordCatalogEvent } from "@/modules/greeting-card/use-cases/catalog-channel-events"
import { log } from "@/core/observability/log"
import { grantBrochureOwnerByCode, isHttps, serializeOwnerCookie } from "@/modules/greeting-card/use-cases/brochure-owner"
import { greetingCatalogOrderBody } from "@/app/api/v1/public/_contracts/requests"

/** POST /api/v1/public/greeting-catalog/[id]/order — đặt hoa từ link bộ sưu tập công khai. */
export const POST = handle<[{ params: Promise<{ id: string }> }]>(async (request, context) => {
  await enforceRateLimit(request, { scope: "greeting-catalog-order", limit: 10, windowMs: 10 * 60_000 })
  const { id } = await context.params
  const parsed = greetingCatalogOrderBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed(issuesToDetails(parsed.error.issues))
  rejectBotSubmission(parsed.data)
  const { tracking, ...input } = parsed.data
  const result = await submitPublicCatalogOrder(id, input)
  // Thống kê theo kênh: lỗi ghi không bao giờ làm hỏng đơn của khách
  if (tracking) {
    await recordCatalogEvent({ catalogId: id, channel: tracking.channel, eventType: "ORDER", visitorId: tracking.visitorId, orderId: result.orderId })
      .catch((err) => log.warn("greeting-catalog: ghi sự kiện ORDER lỗi", { err: String(err) }))
  }
  // Đơn nằm ở phiên `/b/<mã>` mới — trình duyệt vừa đặt là chủ phiên đó
  const cookie = result.sendCode ? await grantBrochureOwnerByCode(result.sendCode, "public-catalog-order") : null
  return jsonResponse(result, { status: 201, ...(cookie ? { headers: { "set-cookie": serializeOwnerCookie(cookie, isHttps(request)) } } : {}) })
})

export const dynamic = "force-dynamic"
