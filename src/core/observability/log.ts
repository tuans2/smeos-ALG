/**
 * Nhật ký có cấu trúc — một dòng JSON cho mỗi sự kiện.
 *
 * `console.log("có gì đó hỏng", err)` đọc được trên máy của lập trình viên và
 * vô dụng trên máy chủ: không lọc được theo tổ chức, không nối được một dòng
 * lỗi với một job, không đếm được. Khi một cửa hàng gọi lên nói "ảnh của tôi
 * không phân tích được", thứ trả lời được câu đó là lọc theo
 * `organization_id` và `job_id`, không phải cuộn một tệp văn bản.
 *
 * Không thêm phụ thuộc: một dòng JSON ra `stdout` là thứ mọi bộ thu nhật ký
 * đọc được, và D19 nói không thêm hạ tầng.
 *
 * KHÔNG BAO GIỜ ghi vào đây: khoá nhà cung cấp, cookie phiên, và dữ liệu cá
 * nhân của khách hàng cuối (tên, số điện thoại, địa chỉ) — cùng ràng buộc với
 * lời gọi mô hình ở PRD mục 7.11.
 */

import { currentRequestId } from "./request-context"

export type MucDo = "debug" | "info" | "warn" | "error"

export type NgữCảnhLog = {
  readonly organizationId?: string | undefined
  readonly workspaceId?: string | undefined
  readonly userId?: string | undefined
  readonly jobId?: string | undefined
  readonly feature?: string | undefined
  readonly [key: string]: unknown
}

const KHOA_CAM = new Set([
  "password",
  "secret",
  "token",
  "apiKey",
  "api_key",
  "authorization",
  "cookie",
  "phone",
  "so_dien_thoai",
  "address",
  "dia_chi",
])

// Khoá chứa các mảnh này cũng bị lọc: `shipperPhone`, `recipientAddress`… từng lọt vào log vì
// danh sách trên chỉ so khớp nguyên khoá (rà soát cụm G, 22/10/2026)
const MANH_CAM = /phone|so_dien_thoai|address|dia_chi|password|secret|cookie|authorization/i

export function laKhoaCam(key: string): boolean {
  return KHOA_CAM.has(key) || MANH_CAM.test(key)
}

function loc(ctx: NgữCảnhLog): Record<string, unknown> {
  const ra: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(ctx)) {
    if (laKhoaCam(k)) continue
    if (v !== undefined) ra[k] = v
  }
  return ra
}

function ghi(muc: MucDo, event: string, ctx: NgữCảnhLog = {}): void {
  const dong = JSON.stringify({
    ts: new Date().toISOString(),
    level: muc,
    event,
    requestId: currentRequestId(),
    ...loc(ctx),
  })
  if (muc === "error") console.error(dong)
  else if (muc === "warn") console.warn(dong)
  else console.log(dong)
}

export const log = {
  debug: (event: string, ctx?: NgữCảnhLog) => ghi("debug", event, ctx),
  info: (event: string, ctx?: NgữCảnhLog) => ghi("info", event, ctx),
  warn: (event: string, ctx?: NgữCảnhLog) => ghi("warn", event, ctx),
  error: (event: string, ctx?: NgữCảnhLog) => ghi("error", event, ctx),
}
