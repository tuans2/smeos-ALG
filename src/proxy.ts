import { NextResponse, type NextRequest } from "next/server"

import { log } from "@/core/observability/log"
import { REQUEST_ID_HEADER, resolveRequestId } from "@/core/observability/request-id"
import { activeDeliveryPhase, isRouteInPhase } from "@/lib/delivery/delivery-phase"
import { resolveCustomDomainRequest } from "@/modules/custom-domain/use-cases/resolve-custom-domain"

/**
 * Gắn `x-request-id` cho mọi request (ROADMAP E1.1): giữ mã hợp lệ từ phía
 * trước (Render, CDN), không thì sinh mới; đưa vào header request cho route
 * đọc và trả lại ở header phản hồi để người dùng/hỗ trợ báo lại được.
 *
 * Tên miền riêng của cửa hàng (checklist ALG 10.8): request tới tên miền đã xác minh chỉ mở trang danh mục,
 * Thẻ Chào, trang cửa hàng thuộc đúng tổ chức sở hữu tên miền; còn lại 404. Lỗi tra cứu → 503 (không mở
 * trang khi chưa chắc chủ sở hữu).
 *
 * Chế độ giai đoạn bàn giao (`NEXT_PUBLIC_DELIVERY_PHASE=gd1`): trang và API ngoài phạm vi trả 404 như
 * không tồn tại. Không đặt biến thì không chặn gì (`src/lib/delivery/delivery-phase.ts`).
 */
export async function proxy(request: NextRequest) {
  const requestId = resolveRequestId(request.headers.get(REQUEST_ID_HEADER))

  if (!isRouteInPhase(request.nextUrl.pathname, activeDeliveryPhase())) {
    const response = new NextResponse("Không tìm thấy trang.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    })
    response.headers.set(REQUEST_ID_HEADER, requestId)
    return response
  }

  let decision: Awaited<ReturnType<typeof resolveCustomDomainRequest>>
  try {
    decision = await resolveCustomDomainRequest(request.headers.get("host"), request.nextUrl.pathname)
  } catch (error) {
    log.error("custom_domain.resolve_failed", { error: error instanceof Error ? error.message : String(error) })
    decision = { action: "unavailable" }
  }
  if (decision.action !== "next") {
    const response = decision.action === "redirect"
      ? NextResponse.redirect(new URL(decision.location, request.nextUrl), 307)
      : new NextResponse(decision.action === "not_found" ? "Không tìm thấy trang." : "Hệ thống đang bận, vui lòng thử lại sau ít phút.", {
          status: decision.action === "not_found" ? 404 : 503,
          headers: { "content-type": "text/plain; charset=utf-8" },
        })
    response.headers.set(REQUEST_ID_HEADER, requestId)
    return response
  }

  const headers = new Headers(request.headers)
  headers.set(REQUEST_ID_HEADER, requestId)
  const response = NextResponse.next({ request: { headers } })
  response.headers.set(REQUEST_ID_HEADER, requestId)
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff2?)$).*)"],
}
