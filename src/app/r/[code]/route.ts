/**
 * GET /r/<mã> — đích của QR/link động. Ghi một lượt quét rồi chuyển tới trang trong cửa hàng
 * (đã gắn `ref` + UTM). Mã sai/tắt/hết hạn → trang "không tìm thấy". Công khai, không phiên.
 */

import { asSystemDb } from "@/core/tenancy/db-context"
import { NextResponse } from "next/server"
import { clientIp, enforceRateLimit } from "@/core/http/rate-limit"
import { publicAppUrl } from "@/lib/public-url"
import { resolveShortLink } from "@/modules/acquisition/use-cases/resolve-short-link"

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params
  try {
    await enforceRateLimit(request, { scope: "short-link-scan", limit: 60, windowMs: 60_000 })
  } catch {
    return new NextResponse("Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.", { status: 429 })
  }
  // Route công khai ngoài `handle()`: tra link rút gọn bằng quyền hệ thống, như /api/v1/public/
  const target = await asSystemDb("route:/r", () =>
    resolveShortLink(code, { ip: clientIp(request), userAgent: request.headers.get("user-agent"), referrer: request.headers.get("referer") }),
  )
  if (!target) return new NextResponse("Link này không còn được sử dụng.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } })
  return NextResponse.redirect(new URL(target, publicAppUrl() || request.url), { status: 302, headers: { "cache-control": "no-store" } })
}

export const dynamic = "force-dynamic"
