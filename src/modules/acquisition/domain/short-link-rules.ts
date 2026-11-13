/**
 * Link/QR động (công cụ 12, 13, 25) — Pure TypeScript.
 *
 * Mã in trên QR trỏ về `/r/<mã>`; cửa hàng đổi đích về sau mà không in lại. Đích chỉ là
 * đường dẫn NỘI BỘ của site (bắt đầu bằng một dấu "/") để không ai mượn mã làm bàn đạp
 * chuyển hướng sang trang lừa đảo (open redirect).
 */

import { sanitizeUtmValue, type Utm } from "./lead-rules"

export const SHORT_LINK_KINDS = ["QR", "SALES_LINK"] as const
export type ShortLinkKind = (typeof SHORT_LINK_KINDS)[number]

export const SHORT_LINK_CODE_LENGTH = 7
/** Bỏ ký tự dễ nhầm khi đọc/gõ lại (0/O, 1/l/I). */
const CODE_ALPHABET = "23456789abcdefghijkmnpqrstuvwxyz"
const CODE_PATTERN = new RegExp(`^[${CODE_ALPHABET}]{${SHORT_LINK_CODE_LENGTH}}$`)
export const SHORT_LINK_NAME_MAX = 100
export const PLACEMENT_LABEL_MAX = 60
const TARGET_PATH_MAX = 500

export type DeviceKind = "MOBILE" | "TABLET" | "DESKTOP" | "UNKNOWN"

export function generateShortLinkCode(randomBytes: Uint8Array): string {
  if (randomBytes.length < SHORT_LINK_CODE_LENGTH) throw new Error("Cần đủ byte ngẫu nhiên")
  let code = ""
  for (let i = 0; i < SHORT_LINK_CODE_LENGTH; i++) code += CODE_ALPHABET[randomBytes[i]! % CODE_ALPHABET.length]
  return code
}

export function isShortLinkCode(value: string): boolean {
  return CODE_PATTERN.test(value)
}

/** Đường dẫn nội bộ hợp lệ: "/..." — không "//", không "\", không ký tự điều khiển, không giao thức. */
export function isSafeTargetPath(path: string): boolean {
  if (!path || path.length > TARGET_PATH_MAX) return false
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return false
  if (/[\\\u0000-\u001f\u007f]/.test(path)) return false
  return !/^\/[a-z][a-z0-9+.-]*:/i.test(path)
}

export function isShortLinkLive(link: { is_active: boolean; expires_at: Date | null }, now: Date): boolean {
  return link.is_active && (link.expires_at === null || link.expires_at.getTime() > now.getTime())
}

/** Gắn `ref` (mã link) + UTM vào đích để trang đích ghi nguồn cho lead. Giữ query sẵn có. */
export function buildRedirectPath(targetPath: string, code: string, utm: Utm): string {
  const url = new URL(targetPath, "http://internal.invalid")
  url.searchParams.set("ref", code)
  if (utm.source) url.searchParams.set("utm_source", utm.source)
  if (utm.medium) url.searchParams.set("utm_medium", utm.medium)
  if (utm.campaign) url.searchParams.set("utm_campaign", utm.campaign)
  return `${url.pathname}${url.search}${url.hash}`
}

export function normalizeUtm(input: { source?: string | null | undefined; medium?: string | null | undefined; campaign?: string | null | undefined }): Utm {
  return { source: sanitizeUtmValue(input.source), medium: sanitizeUtmValue(input.medium), campaign: sanitizeUtmValue(input.campaign) }
}

/** UTM mặc định theo loại: QR in ấn → medium "qr"; link bán hàng → "link". */
export function defaultUtmMedium(kind: ShortLinkKind): string {
  return kind === "QR" ? "qr" : "link"
}

export function detectDevice(userAgent: string | null): DeviceKind {
  if (!userAgent) return "UNKNOWN"
  const ua = userAgent.toLowerCase()
  if (/ipad|tablet|(android(?!.*mobile))/.test(ua)) return "TABLET"
  if (/mobi|iphone|android|zalo|fban|fbav/.test(ua)) return "MOBILE"
  if (/windows|macintosh|linux|cros/.test(ua)) return "DESKTOP"
  return "UNKNOWN"
}

/** Chỉ giữ tên miền của trang giới thiệu — không lưu đường dẫn đầy đủ (có thể chứa dữ liệu cá nhân). */
export function referrerHost(referrer: string | null): string | null {
  if (!referrer) return null
  try {
    return new URL(referrer).hostname.slice(0, 120) || null
  } catch {
    return null
  }
}
