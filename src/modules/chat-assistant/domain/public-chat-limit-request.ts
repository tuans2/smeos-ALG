/**
 * Yêu cầu nâng hạn mức chat công khai: chủ tiệm gửi, Admin nền tảng duyệt.
 * Yêu cầu chờ duyệt nằm ở `organizations.settings.pending_public_chat_limits`;
 * hạn mức đã duyệt ghi vào `config.publicChatLimits` của các kênh trang công khai.
 * Thuần — không Prisma, không mạng.
 */
import {
  DEFAULT_PUBLIC_CHAT_LIMITS,
  PUBLIC_CHAT_LIMIT_CEILING,
  type PublicChatLimits,
} from "./public-chat-policy"
import type { SupportedChatChannel } from "./channel-integration-types"

export const PENDING_PUBLIC_CHAT_LIMITS_KEY = "pending_public_chat_limits"

/** Kênh của các trang công khai — hạn mức đã duyệt áp cho cả hai. */
export const PUBLIC_CHAT_CHANNELS: readonly SupportedChatChannel[] = ["STOREFRONT_CATALOG", "LANDING_PAGE"]

/** Các mức được phép xin — chọn sẵn để Admin dễ duyệt, không nhập số tự do. */
export const PUBLIC_CHAT_LIMIT_TIERS = [
  { perVisitor: 50, perIp: 150 },
  { perVisitor: 100, perIp: 300 },
  { perVisitor: PUBLIC_CHAT_LIMIT_CEILING.perVisitor, perIp: PUBLIC_CHAT_LIMIT_CEILING.perIp },
] as const

export interface PendingPublicChatLimitRequest {
  per_visitor: number
  per_ip: number
  requested_at: string
  requested_by: string
  note: string | null
}

export function isAllowedLimitTier(perVisitor: number, perIp: number): boolean {
  return PUBLIC_CHAT_LIMIT_TIERS.some((t) => t.perVisitor === perVisitor && t.perIp === perIp)
}

/** Mức xin phải là một mức chọn sẵn và cao hơn mức đang áp dụng. */
export function canRequestLimits(current: PublicChatLimits, perVisitor: number, perIp: number): boolean {
  return isAllowedLimitTier(perVisitor, perIp) && (perVisitor > current.perVisitor || perIp > current.perIp)
}

/** Đọc yêu cầu chờ duyệt từ settings; dữ liệu hỏng → null. */
export function readPendingLimitRequest(settings: unknown): PendingPublicChatLimitRequest | null {
  if (!settings || typeof settings !== "object") return null
  const raw = (settings as Record<string, unknown>)[PENDING_PUBLIC_CHAT_LIMITS_KEY]
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  if (typeof r.per_visitor !== "number" || typeof r.per_ip !== "number" || typeof r.requested_at !== "string") {
    return null
  }
  return {
    per_visitor: r.per_visitor,
    per_ip: r.per_ip,
    requested_at: r.requested_at,
    requested_by: typeof r.requested_by === "string" ? r.requested_by : "",
    note: typeof r.note === "string" ? r.note : null,
  }
}

export { DEFAULT_PUBLIC_CHAT_LIMITS }
