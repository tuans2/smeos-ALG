import { captureError } from "./error-tracker"
import { log } from "./log"

type RequestInfo = { path: string; method: string; headers: Record<string, string | string[] | undefined> }
type ErrorContext = { routePath?: string; routeType?: string }

const MAX_MESSAGE_LENGTH = 500

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

/**
 * Lỗi máy chủ không ai bắt (Server Component, route handler, server action) → một dòng log
 * `http.unhandled_error` có cấu trúc, để lọc và đặt cảnh báo trên log stream của Render.
 *
 * Không ghi header, cookie hay query string: link công khai mang token trong `?t=` (thẻ gia
 * công) và mã đơn trong đường dẫn là đủ để lần lại.
 */
export function reportRequestError(error: unknown, request: RequestInfo, context: ErrorContext): void {
  const message = error instanceof Error ? error.message : String(error)
  const digest =
    typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : undefined
  const requestId = firstHeader(request.headers["x-request-id"]) ?? firstHeader(request.headers["rndr-id"])
  const path = request.path.split("?")[0]
  captureError(error, { method: request.method, path, routePath: context.routePath, requestId, digest })
  log.error("http.unhandled_error", {
    method: request.method,
    path,
    routePath: context.routePath,
    routeType: context.routeType,
    requestId,
    errorName: error instanceof Error ? error.name : typeof error,
    message: message.slice(0, MAX_MESSAGE_LENGTH),
    digest,
  })
}
