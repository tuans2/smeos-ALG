/**
 * Mục "Nâng hạn mức chat công khai" trong danh sách chờ duyệt của nền tảng.
 * Thuần — dựng từ settings của tổ chức.
 */
import { readPendingLimitRequest } from "@/modules/chat-assistant/domain/public-chat-limit-request"

export interface PublicChatLimitApprovalFields {
  type: "PUBLIC_CHAT_LIMITS"
  requestedAt: string
  requestedBy?: string
  note?: string | null
  requestedLimits: { perVisitor: number; perIp: number }
}

export function publicChatLimitApproval(settings: unknown): PublicChatLimitApprovalFields | null {
  const pending = readPendingLimitRequest(settings)
  if (!pending) return null
  return {
    type: "PUBLIC_CHAT_LIMITS",
    requestedAt: pending.requested_at,
    ...(pending.requested_by ? { requestedBy: pending.requested_by } : {}),
    note: pending.note,
    requestedLimits: { perVisitor: pending.per_visitor, perIp: pending.per_ip },
  }
}
