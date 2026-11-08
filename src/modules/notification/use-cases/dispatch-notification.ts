/**
 * DISPATCH NOTIFICATION USE-CASE
 *
 * Nhận sự kiện nghiệp vụ, kiểm tra phân quyền & cài đặt (resolve cascading),
 * và fan-out phát tán tới các kênh phù hợp.
 *
 * @module notification/use-cases
 */
import { log } from "@/core/observability/log"
import type { NotifyChannel } from "../domain/events/_contract"
import type {
  NotificationPayload,
  NotificationRecipient,
  ChannelSendResult,
} from "../domain/notification-payload"
import { getNotificationEvent } from "../domain/events"
import { resolveEffectiveNotification } from "./resolve-effective-notification"
import { getChannelAdapter } from "../infra/channel-adapters"

const SUPPORTED_CHANNELS: NotifyChannel[] = [
  "APP_INBOX",
  "TELEGRAM",
  "EMAIL",
  "PUSH",
  "ZALO",
  "SMS",
]

export interface DispatchNotificationInput {
  eventKey: string
  recipient: NotificationRecipient
  title?: string | undefined
  message?: string | undefined
  deepLink?: string | undefined
  parentOrgId?: string | undefined
  /** Chuỗi cha chính của tổ chức nhận — chỉ mở phạm vi khoá cứng, không đổi chính sách mặc định (P2-A11). */
  lockParentOrgId?: string | undefined
  metadata?: Record<string, unknown> | undefined
}

export interface DispatchNotificationResult {
  eventKey: string
  recipientUserId: string
  dispatchedChannels: NotifyChannel[]
  results: ChannelSendResult[]
}

export async function dispatchNotification(
  input: DispatchNotificationInput
): Promise<DispatchNotificationResult> {
  const { eventKey, recipient, deepLink, parentOrgId, lockParentOrgId, metadata } = input
  const eventDef = getNotificationEvent(eventKey)

  const title = input.title ?? eventDef?.label ?? eventKey
  const message = input.message ?? eventDef?.description ?? ""

  const dispatchedChannels: NotifyChannel[] = []
  const results: ChannelSendResult[] = []

  for (const channel of SUPPORTED_CHANNELS) {
    const resolve = await resolveEffectiveNotification({
      eventKey,
      channel,
      userId: recipient.userId,
      roleKey: recipient.roleKey,
      storeOrgId: recipient.organizationId,
      parentOrgId,
      lockParentOrgId,
    })

    if (!resolve.enabled) {
      continue
    }

    const adapter = getChannelAdapter(channel)
    if (!adapter) {
      continue
    }

    const payload: NotificationPayload = {
      eventKey,
      recipient,
      title,
      message,
      // Template còn biến chưa điền ({orderId}) thì không gắn — link hỏng tệ hơn không có link
      deepLink: deepLink ?? (eventDef?.deepLinkTemplate?.includes("{") ? undefined : eventDef?.deepLinkTemplate ?? undefined),
      priority: resolve.priority,
      metadata,
    }

    try {
      const sendRes = await adapter.send(payload)
      results.push(sendRes)
      if (sendRes.success) {
        dispatchedChannels.push(channel)
      }
    } catch (err) {
      log.warn("Lỗi khi gửi qua kênh notification", {
        channel,
        eventKey,
        error: err instanceof Error ? err.message : String(err),
      })
      results.push({
        channel,
        success: false,
        error: err instanceof Error ? err.message : "Dispatch error",
      })
    }
  }

  log.info("Notification dispatched", {
    eventKey,
    userId: recipient.userId,
    channels: dispatchedChannels,
  })

  return {
    eventKey,
    recipientUserId: recipient.userId,
    dispatchedChannels,
    results,
  }
}
