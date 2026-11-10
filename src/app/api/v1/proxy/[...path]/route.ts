/**
 *Proxy route — `/api/v1/proxy/[...path]?client=SOCIALFLOW|LOCALBUDD`.
 *
 * Core làm proxy server-side để dashboard gọi tính năng thuộc engine ngoài
 * (LocalBudd/SocialFlow) mà không chuyển UI. Xem `domain/proxy-rules.ts` và
 * `use-cases/proxy-request.ts`.
 *
 * An toàn: không proxy mọi URL — chỉ forward path đã whitelist theo client,
 * và forward body/raw headers theo đúng danh tính (JWT/Token), không forward
 * cookie core sang sibling.
 *
 * Dùng `Request` + `context` (Next 16 dynamic route signature) thay vì
 * `NextRequest`, để handler là hàm thuần — bộ test cách ly tenant
 * (`tests/tenant/`) có thể gọi thẳng handler bằng một `Request` giả, giống
 * mọi route khác trong repo (xem `handle()` ở `core/http/response.ts`).
 */

import { handle } from "@/core/http/response"
import { AppError } from "@/core/http/errors"
import { callProxy, toProxyError } from "@/modules/proxy/use-cases/proxy-request"
import { isAllowedProxyPath, proxyCapabilityFor, type ProxyClient } from "@/modules/proxy/domain/proxy-rules"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"

/** Trả về Response từ proxy result. */
function toResponse(res: { status: number; headers: Record<string, string>; body: string }): Response {
  const headers = new Headers()
  for (const [key, value] of Object.entries(res.headers)) {
    // content-length/transfer-encoding do sibling set, core Next tự tính lại.
    if (key === "content-length" || key === "transfer-encoding") continue
    headers.set(key, value)
  }
  return new Response(res.body, { status: res.status, headers })
}

async function proxyHandler(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: pathParts } = await context.params
  const url = new URL(request.url)
  const clientParam = url.searchParams.get("client")
  if (!clientParam || (clientParam !== "SOCIALFLOW" && clientParam !== "LOCALBUDD")) {
    throw new AppError("VALIDATION_FAILED", "Thiếu hoặc sai tham số `client` (SOCIALFLOW | LOCALBUDD)")
  }
  const client = clientParam as ProxyClient

  const path = "/" + pathParts.join("/")
  const normalized = path.replace(/^\//, "")
  if (!isAllowedProxyPath(client, normalized)) {
    throw new AppError("NOT_FOUND", "Đường dẫn này không được proxy")
  }

  // Luôn đòi phiên của tổ chức (audit API §33): trước đây chỉ lệnh ghi `api/accounts` mới kiểm, mọi đường dẫn khác trong
  // danh sách trắng (kể cả `api/v1/worker/cron` của LocalBudd) được chuyển tiếp cho người chưa đăng nhập — core thành
  // điểm chuyển tiếp công khai vào hệ thống ngoài. Mọi nơi gọi proxy đều là màn hình của người đã đăng nhập.
  const { ctx } = await requireTenantContext(request)
  const capability = proxyCapabilityFor(client, request.method.toUpperCase(), normalized)
  if (capability) requireCapability(ctx, capability)

  const res = await callProxy({ client, request, path })
  const err = toProxyError(res, client)
  if (err) throw err

  return toResponse(res)
}

export const GET = handle(proxyHandler)
export const POST = handle(proxyHandler)
export const PUT = handle(proxyHandler)
export const PATCH = handle(proxyHandler)
export const DELETE = handle(proxyHandler)

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const