/**
 * NOTIFICATION PAYLOAD DOMAIN DEFINITIONS
 *
 * Chuẩn hóa cấu trúc gói tin thông báo trao đổi giữa use-cases và adapters.
 * Pure TypeScript.
 *
 * @module notification/domain
 */
import type { NotifyChannel, NotifyPriority } from "./events/_contract"

export interface NotificationRecipient {
  userId: string
  roleKey: string
  organizationId: string
  email?: string | undefined
  phone?: string | undefined
  telegramChatId?: string | undefined
  zaloUserId?: string | undefined
}

export interface NotificationPayload {
  eventKey: string
  recipient: NotificationRecipient
  title: string
  message: string
  deepLink?: string | undefined
  priority?: NotifyPriority | undefined
  metadata?: Record<string, unknown> | undefined
}

export interface ChannelSendResult {
  channel: NotifyChannel
  success: boolean
  messageId?: string | undefined
  error?: string | undefined
}
