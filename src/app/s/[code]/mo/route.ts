import { asSystemDb } from "@/core/tenancy/db-context"
import { NextResponse } from "next/server"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { openShareLink } from "@/modules/greeting-card/use-cases/share-links"
import { grantBrochureOwner, serializeOwnerCookie } from "@/modules/greeting-card/use-cases/brochure-owner"
import { FRESH_SESSION_PARAM } from "@/modules/greeting-card/domain/session-owner"

const COOKIE_PREFIX = "fl_s_"
const COOKIE_MAX_AGE = 30 * 86_400

const gone = () =>
  new NextResponse(
    "<!doctype html><html lang=\"vi\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Link không còn hiệu lực</title><body style=\"font-family:system-ui;padding:32px;text-align:center\"><h1 style=\"font-size:20px\">Link không còn hiệu lực</h1><p>Vui lòng liên hệ cửa hàng để nhận link mới.</p></body></html>",
    { status: 404, headers: { "content-type": "text/html; charset=utf-8" } },
  )

/**
 * GET /s/<mã>/mo — trình duyệt thật của khách (trang /s/<mã> tự chuyển tới đây bằng JavaScript,
 * máy quét xem trước link không chạy tới). Mỗi khách một phiên riêng tính cho người đã sao chép link,
 * nhớ qua cookie để tải lại không tạo phiên mới; rồi chuyển sang trang Thẻ chào `/b/<mã phiên>`.
 * Trình duyệt này được trao luôn cookie chủ phiên: ai khác mở `/b/<mã phiên>` đó sẽ được đưa về đây
 * để nhận phiên riêng, không thấy phiên của người trước. Dấu `?moi=1` cho `/b/` biết phiên vừa tạo cho
 * chính trình duyệt này — không có cookie thì dừng, không chuyển lại đây (tránh vòng tạo phiên rác).
 */
export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const code = (await context.params).code.toUpperCase()
  const url = new URL(request.url)
  try {
    await enforceRateLimit(request, { scope: "greeting-share-open", limit: 30, windowMs: 10 * 60_000 })
  } catch {
    return new NextResponse("Bạn mở link quá nhiều lần, vui lòng thử lại sau ít phút.", { status: 429, headers: { "content-type": "text/plain; charset=utf-8" } })
  }
  const cookieName = `${COOKIE_PREFIX}${code}`
  const known = request.headers.get("cookie")?.split(/;\s*/).find((c) => c.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1) ?? null
  // Route công khai ngoài `handle()`: tra theo mã chia sẻ bằng quyền hệ thống, như /api/v1/public/
  const opened = await asSystemDb("route:/s/mo", () => openShareLink(code, known ? decodeURIComponent(known) : null))
  if (!opened) return gone()

  // Location TƯƠNG ĐỐI: sau proxy của Render, `request.url` là địa chỉ nội bộ (localhost:3100) —
  // dựng URL tuyệt đối từ nó đưa khách sang localhost. Trình duyệt tự ghép với tên miền đang mở.
  const res = new NextResponse(null, { status: 302, headers: { location: `/b/${encodeURIComponent(opened.sendCode)}?${FRESH_SESSION_PARAM}=1` } })
  const https = (request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "")).split(",")[0]?.trim() === "https"
  res.cookies.set(cookieName, opened.sendCode, { httpOnly: true, sameSite: "lax", secure: https, maxAge: COOKIE_MAX_AGE, path: "/" })
  const owner = await asSystemDb("route:/s/mo", () => grantBrochureOwner({ id: opened.sessionId, organization_id: opened.organizationId, send_code: opened.sendCode }, "share-link"))
  res.headers.append("set-cookie", serializeOwnerCookie(owner, https))
  return res
}

export const dynamic = "force-dynamic"
