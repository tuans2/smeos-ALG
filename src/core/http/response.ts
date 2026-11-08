import { ZodError } from "zod"

import { captureError } from "@/core/observability/error-tracker"
import { dbContextForPath, runWithDbContext } from "@/core/tenancy/db-context"
import { log } from "@/core/observability/log"
import { currentRequestMeta, requestIdOf, runWithRequestMeta } from "@/core/observability/request-context"

import { AppError, payloadTooLarge, validationFailed } from "./errors"
import { withUnreadBodyCacheHeader } from "./ack-routes"
import { withDeprecationHeaders } from "./deprecation"
import { clientIp } from "./rate-limit"
import { auditDenied, auditMutation, userAgentOf } from "./request-audit"

export function jsonResponse(
  body: unknown,
  init?: { status?: number; headers?: Record<string, string | string[]> }
): Response {
  const headers = new Headers({ "content-type": "application/json; charset=utf-8" })
  // `string[]` cho một khoá — cần khi một response phải đặt NHIỀU Set-Cookie
  // cùng lúc (Unified Shell B1: cookie phiên hiện có + cookie JWT liên-app),
  // điều `Headers.set` không làm được vì nó ghi đè thay vì cộng dồn.
  for (const [key, value] of Object.entries(init?.headers ?? {})) {
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v)
    } else {
      headers.append(key, value)
    }
  }
  // Phản hồi API mang dữ liệu tổ chức → mặc định không lưu đệm (audit API-17, 07/11/2026); route nào
  // muốn đệm (ảnh công khai, tệp xuất) tự đặt `cache-control` và được giữ nguyên.
  if (!headers.has("cache-control")) headers.set("cache-control", "no-store")
  const status = init?.status ?? 200
  // 204/205/304 không được có body — `new Response("null", { status: 204 })` ném TypeError → 500 sau khi đã ghi xong.
  if (status === 204 || status === 205 || status === 304) {
    headers.delete("content-type")
    return new Response(null, { status, headers })
  }
  return new Response(JSON.stringify(body), { status, headers })
}

/**
 * Lỗi dữ liệu đầu vào lọt khỏi route thành `AppError` 400 (audit API-01): `schema.parse` ở route
 * hoặc use-case ném `ZodError` — mọi chỗ gọi đều parse dữ liệu người dùng gửi — từng thành 500.
 * `details.issues` cùng dạng các route dùng `safeParse`.
 */
function asAppError(error: unknown): AppError | null {
  if (error instanceof AppError) return error
  if (error instanceof ZodError) return validationFailed({ issues: error.issues })
  return null
}

/** Trần thân JSON mặc định của `handle()` (audit API-17, PO 07/11/2026). Tải tệp đi `formData`/URL ký. */
export const MAX_JSON_BODY_BYTES = 2 * 1024 * 1024

/** Đọc thân theo luồng, dừng ngay khi vượt trần — không nạp cả thân khổng lồ vào bộ nhớ rồi mới chặn. */
async function readCappedText(request: Request, maxBytes: number): Promise<string> {
  if (request.bodyUsed) throw new TypeError("Body is unusable: Body has already been read")
  const declared = Number(request.headers.get("content-length") ?? Number.NaN)
  if (Number.isFinite(declared) && declared > maxBytes) throw payloadTooLarge(maxBytes)
  if (!request.body) return ""
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      throw payloadTooLarge(maxBytes)
    }
    chunks.push(value)
  }
  return new TextDecoder().decode(Buffer.concat(chunks))
}

/**
 * `request.json()` của request trong `handle()`: thân vượt `MAX_JSON_BODY_BYTES` → 413; không phải JSON
 * hợp lệ (rỗng, cắt cụt, sai cú pháp) → 400 thay vì 500 (audit API-01). Chỉ bọc request này, nên
 * `JSON.parse` ở chỗ khác vẫn là lỗi máy chủ. Route đang `.catch(() => null)` vẫn nhận `null` như cũ.
 */
function guardJsonBody(request: Request): void {
  request.json = async () => {
    const text = await readCappedText(request, MAX_JSON_BODY_BYTES)
    try {
      return JSON.parse(text) as unknown
    } catch (error) {
      throw error instanceof SyntaxError ? validationFailed({ body: "Thân yêu cầu không phải JSON hợp lệ" }) : error
    }
  }
}

/**
 * `RateLimit-Limit/Remaining/Reset` (giây tới lúc mở lại) và `Retry-After` khi 429, theo luật chặt
 * nhất mà `enforceRateLimit` đã đếm trong request (đặc tả 06 §2, audit API-08). Route không giới hạn
 * tần suất thì không có header nào.
 */
function withRateLimitHeaders(response: Response, now = Date.now()): Response {
  const state = currentRequestMeta()?.rateLimit
  if (!state) return response
  const resetSeconds = String(Math.max(1, Math.ceil((state.resetAt - now) / 1000)))
  try {
    response.headers.set("RateLimit-Limit", String(state.limit))
    response.headers.set("RateLimit-Remaining", String(state.remaining))
    response.headers.set("RateLimit-Reset", resetSeconds)
    if (response.status === 429) response.headers.set("Retry-After", resetSeconds)
  } catch {
    // Header bất biến (vd. `Response.redirect`) — giữ nguyên phản hồi, chỉ thiếu header tần suất
  }
  return response
}

export function errorResponse(error: unknown, where?: { method: string; path: string }): Response {
  const known = asAppError(error)
  if (known) {
    return jsonResponse(
      {
        error: {
          code: known.code,
          message: known.message,
          ...(known.details ? { details: known.details } : {}),
        },
      },
      { status: known.status }
    )
  }

  // Lỗi ngoài dự kiến không lộ chi tiết ra ngoài (`YC-S`, đặc tả 06 mục 2).
  // SLI lỗi máy chủ theo route (SLO v1, OPERATIONS_RUNBOOK §10); `requestId` tự gắn khi trong `handle()`.
  captureError(error, where)
  log.error("http.internal_error", {
    ...where,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  })
  return jsonResponse(
    { error: { code: "INTERNAL", message: "Lỗi hệ thống" } },
    { status: 500 }
  )
}

/**
 * Bọc một handler để mọi `AppError` ném ra đều thành đáp ứng đúng hình dạng.
 *
 * Generic theo `Args` để cùng một `handle` dùng được cho cả route tĩnh (chỉ
 * `request`) lẫn route động của Next.js, vốn gọi handler bằng
 * `(request, { params })` với `params` là một `Promise` (Next 16).
 */
export function handle<Args extends unknown[]>(
  fn: (request: Request, ...args: Args) => Promise<Response>
) {
  return async (request: Request, ...args: Args): Promise<Response> => {
    // Mã yêu cầu do `src/proxy.ts` gắn — `log` và job tạo trong handler tự nhận (E1.1). IP và thiết
    // bị đi cùng để `audit_logs` tự điền (checklist ALG 1.17).
    const meta = { requestId: requestIdOf(request) ?? undefined, ip: clientIp(request), userAgent: userAgentOf(request) }
    // Ngữ cảnh CSDL cho RLS (checklist ALG 1.18): `requireTenantContext` gắn tổ chức sau khi xác thực
    const pathname = new URL(request.url).pathname
    const dbContext = dbContextForPath(pathname)
    // Endpoint đang chờ gỡ (`deprecation.ts`) → header Deprecation/Sunset/Link trên mọi phản hồi
    // Lỗi và route chỉ xác nhận — client có thể không đọc thân (`ack-routes.ts`) → `no-cache` thay `no-store`
    const finish = (response: Response) =>
      withDeprecationHeaders(withUnreadBodyCacheHeader(response, request.method, pathname), request.method, pathname)
    return runWithRequestMeta(meta, () => runWithDbContext(dbContext, async () => {
      try {
        guardJsonBody(request)
        const response = await fn(request, ...args)
        await auditMutation(request, response)
        return finish(withRateLimitHeaders(response))
      } catch (error) {
        await auditDenied(request, error)
        return finish(withRateLimitHeaders(errorResponse(error, { method: request.method, path: pathname })))
      }
    }))
  }
}
