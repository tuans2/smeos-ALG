import * as Sentry from "@sentry/nextjs"

import type { ErrorTracker } from "../error-tracker"

/**
 * Adapter Sentry cho máy chủ web (ROADMAP E1.5). Chỉ gửi lỗi — không đo hiệu năng, không replay.
 * `beforeSend` bỏ mọi thứ có thể chứa dữ liệu khách: body, cookie, header, query, người dùng,
 * breadcrumb (log console có thể chứa nội dung đơn). Còn lại: loại lỗi, stack, các tag mã định danh.
 */
export function scrubEvent<T extends { request?: unknown; user?: unknown; breadcrumbs?: unknown; extra?: unknown }>(event: T): T {
  delete event.request
  delete event.user
  delete event.breadcrumbs
  delete event.extra
  return event
}

export function initSentryErrorTracker(dsn: string): ErrorTracker {
  Sentry.init({
    dsn,
    environment: process.env["SENTRY_ENVIRONMENT"] ?? process.env.NODE_ENV,
    release: process.env["RENDER_GIT_COMMIT"],
    tracesSampleRate: 0,
    maxBreadcrumbs: 0,
    beforeSend: (event) => scrubEvent(event),
  })
  return {
    capture(error, tags) {
      Sentry.captureException(error, { tags })
    },
  }
}
