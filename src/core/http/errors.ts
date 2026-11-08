/**
 * Một hình dạng lỗi duy nhất cho toàn bộ `/api/v1/` (đặc tả 06 mục 2).
 *
 *   { "error": { "code": "…", "message": "…", "details": { } } }
 */

export type ErrorCode =
  | "VALIDATION_FAILED"
  | "UNAUTHENTICATED"
  | "CAPABILITY_DENIED"
  | "ENTITLEMENT_REQUIRED"
  | "PASSWORD_CHANGE_REQUIRED"
  | "SUBSCRIPTION_OVERDUE"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "QUOTA_EXCEEDED"
  | "UNPROCESSABLE_ENTITY"
  | "RATE_LIMITED"
  | "INTERNAL"

const HTTP_STATUS: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  CAPABILITY_DENIED: 403,
  ENTITLEMENT_REQUIRED: 403,
  PASSWORD_CHANGE_REQUIRED: 403,
  // Gói thuê bao quá hạn thanh toán → chỉ xem (checklist ALG 10.7, PO Q9)
  SUBSCRIPTION_OVERDUE: 402,
  NOT_FOUND: 404,
  CONFLICT: 409,
  // Thân JSON vượt trần của `handle()` (audit API-17, PO 07/11/2026: 2 MB)
  PAYLOAD_TOO_LARGE: 413,
  QUOTA_EXCEEDED: 422,
  UNPROCESSABLE_ENTITY: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
}

/** Mọi mã lỗi theo thứ tự khai — OpenAPI (`src/core/http/openapi.ts`) liệt kê từ đây, không chép tay. */
export const ERROR_CODES = Object.keys(HTTP_STATUS) as ErrorCode[]

export class AppError extends Error {
  readonly code: ErrorCode
  readonly details: Record<string, unknown> | undefined

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = "AppError"
    this.code = code
    this.details = details
  }

  get status(): number {
    return HTTP_STATUS[this.code]
  }
}

/**
 * Không tìm thấy — hoặc thuộc tổ chức khác. Hai trường hợp trả về cùng một
 * câu trả lời là có chủ đích: phân biệt chúng là xác nhận bản ghi tồn tại.
 */
export function notFound(): AppError {
  return new AppError("NOT_FOUND", "Không tìm thấy")
}

export function unauthenticated(): AppError {
  return new AppError("UNAUTHENTICATED", "Cần đăng nhập")
}

/** Mã lý do trong `details.reason` khi phiên bị thay bởi lần đăng nhập ở nơi khác. */
export const SESSION_SUPERSEDED = "SESSION_SUPERSEDED"

export function sessionSuperseded(): AppError {
  return new AppError(
    "UNAUTHENTICATED",
    "Tài khoản của bạn vừa được đăng nhập trên một thiết bị khác",
    { reason: SESSION_SUPERSEDED }
  )
}

export function validationFailed(details?: Record<string, unknown>): AppError {
  return new AppError("VALIDATION_FAILED", "Dữ liệu gửi lên không hợp lệ", details)
}

/**
 * 422 — dữ liệu đúng dạng nhưng vi phạm luật nghiệp vụ (vd. bài nhạc không
 * thuộc tiệm, thiếu cam kết giấy phép). Sai dạng/thiếu trường vẫn là 400
 * `validationFailed`.
 */
export function unprocessable(message: string, details?: Record<string, unknown>): AppError {
  return new AppError("UNPROCESSABLE_ENTITY", message, details)
}

export function conflict(message: string): AppError {
  return new AppError("CONFLICT", message)
}

/** Hạn mức chặn tại điểm tạo job, trước khi job vào bảng (`YC-U3`). */
export function quotaExceeded(message: string, details?: Record<string, unknown>): AppError {
  return new AppError("QUOTA_EXCEEDED", message, details)
}

/** 413 — thân yêu cầu vượt trần (`handle()` chặn trước khi đọc hết vào bộ nhớ). */
export function payloadTooLarge(maxBytes: number): AppError {
  return new AppError("PAYLOAD_TOO_LARGE", "Dữ liệu gửi lên quá lớn", { max_bytes: maxBytes })
}
