/**
 * Link chia sẻ chợ đối tác (PO 01/11/2026): người nhận xem danh sách đã che một phần
 * mà không cần đăng nhập. Thời hạn do người tạo chọn; huỷ được bất kỳ lúc nào. Thuần.
 */

export const SHARE_LINK_MIN_DAYS = 1
export const SHARE_LINK_MAX_DAYS = 365
export const SHARE_LINK_LABEL_MAX = 120

export type ShareLinkStatus = "ACTIVE" | "EXPIRED" | "REVOKED"

export interface ShareLinkRecord {
  id: string
  label: string
  expiresAt: Date
  revokedAt: Date | null
  createdBy: string
  viewCount: number
  lastViewedAt: Date | null
  createdAt: Date
}

export function shareLinkStatus(link: Pick<ShareLinkRecord, "expiresAt" | "revokedAt">, now: Date): ShareLinkStatus {
  if (link.revokedAt) return "REVOKED"
  return link.expiresAt.getTime() <= now.getTime() ? "EXPIRED" : "ACTIVE"
}

export function isValidShareLinkDays(days: number): boolean {
  return Number.isInteger(days) && days >= SHARE_LINK_MIN_DAYS && days <= SHARE_LINK_MAX_DAYS
}

export function shareLinkExpiry(now: Date, days: number): Date {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
}

/** Token trên URL: 32 byte ngẫu nhiên dạng base64url (43 ký tự). */
export const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/
