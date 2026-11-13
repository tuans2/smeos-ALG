/**
 * Cổng theo dõi lỗi (ROADMAP E1.5, PO chọn Sentry — Q1). Mặc định không làm gì; `instrumentation.ts`
 * gắn adapter Sentry khi có `SENTRY_DSN`. Chỉ truyền mã định danh, không dữ liệu khách — adapter
 * còn lọc lại lần nữa trước khi gửi.
 */
import { laKhoaCam } from "./log"
import { currentRequestId } from "./request-context"

export type ErrorContext = {
  readonly method?: string | undefined
  readonly path?: string | undefined
  readonly routePath?: string | undefined
  readonly requestId?: string | undefined
  readonly [key: string]: unknown
}

export interface ErrorTracker {
  capture(error: unknown, context: Record<string, string>): void
}

let tracker: ErrorTracker | null = null

export function setErrorTracker(next: ErrorTracker | null): void {
  tracker = next
}

/** Chỉ giữ chuỗi/số ngắn, bỏ khoá nhạy cảm; tự thêm `requestId` của request đang chạy. */
export function errorTags(context: ErrorContext): Record<string, string> {
  const tags: Record<string, string> = {}
  const requestId = context.requestId ?? currentRequestId()
  for (const [k, v] of Object.entries({ ...context, requestId })) {
    if (v === undefined || v === null || laKhoaCam(k)) continue
    if (typeof v !== "string" && typeof v !== "number") continue
    tags[k] = String(v).slice(0, 200)
  }
  return tags
}

export function captureError(error: unknown, context: ErrorContext = {}): void {
  if (!tracker) return
  try {
    tracker.capture(error, errorTags(context))
  } catch {
    // Theo dõi lỗi không bao giờ được làm hỏng request đang xử lý.
  }
}
