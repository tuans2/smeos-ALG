/**
 * Che dữ liệu cá nhân và bí mật trước khi lưu payload sự kiện vào nhật ký.
 * Giới hạn độ sâu và độ dài để một payload lớn/độc không làm phình bảng.
 */

const SECRET_KEY = /(token|secret|password|signature|authorization|api[_-]?key)/i
const PHONE = /(\+?84|0)(\d[\s.-]?){8,10}\d/g
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
/** Mã định danh (mã đơn, mã sự kiện): giữ nguyên — mã đơn số dài dễ bị nhầm là số điện thoại. */
const ID_KEY = /(^id$|Id$|_id$|_sn$|^orderId$)/
const MAX_DEPTH = 6
const MAX_STRING = 500
const MAX_KEYS = 100

function redactString(value: string): string {
  const masked = value.replace(EMAIL, "[email]").replace(PHONE, "[sđt]")
  return masked.length > MAX_STRING ? `${masked.slice(0, MAX_STRING)}…` : masked
}

export function redactPayload(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[…]"
  if (typeof value === "string") return redactString(value)
  if (Array.isArray(value)) return value.slice(0, MAX_KEYS).map((item) => redactPayload(item, depth + 1))
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value).slice(0, MAX_KEYS)) {
      if (SECRET_KEY.test(key)) out[key] = "[đã ẩn]"
      else if (ID_KEY.test(key) && typeof item === "string") out[key] = item.slice(0, 120)
      else out[key] = redactPayload(item, depth + 1)
    }
    return out
  }
  return value
}
