/**
 * APP INBOX CHANNEL ADAPTER
 *
 * Kênh In-App Notification Center — luôn kích hoạt, không thể tắt.
 * Ghi nhận vào bảng `notification_inbox` và kích hoạt luồng real-time SSE.
 *
 * @module notification/infra/channel-adapters
 */
import { log } from "@/core/observability/log"
import type { INotificationChannelAdapter } from "./_channel-adapter.interface"
import type { NotificationPayload, ChannelSendResult } from "../../domain/notification-payload"
import type { INotificationPreferenceRepository } from "../../domain/repositories/notification-preference-repository.interface"
import { getNotificationPreferenceRepository } from "../notification-preference-repository"
import { sseNotificationHub } from "../../adapters/notification-sse-adapter"

export class AppInboxAdapter implements INotificationChannelAdapter {
  readonly channel = "APP_INBOX" as const

  constructor(
    private readonly repo: INotificationPreferenceRepository = getNotificationPreferenceRepository()
  ) {}

  async send(payload: NotificationPayload): Promise<ChannelSendResult> {
    try {
      const created = await this.repo.createInboxItem({
        userId: payload.recipient.userId,
        organizationId: payload.recipient.organizationId,
        eventKey: payload.eventKey,
        title: payload.title,
        message: payload.message,
        deepLink: payload.deepLink,
        priority: payload.priority,
      })

      // Kích hoạt broadcast real-time tới client đang mở SSE
      sseNotificationHub.broadcastToUser(payload.recipient.userId, {
        id: created.id,
        eventKey: payload.eventKey,
        title: payload.title,
        message: payload.message,
        deepLink: payload.deepLink ?? null,
        priority: payload.priority ?? "NORMAL",
        createdAt: created.createdAt.toISOString(),
      })

      return {
        channel: "APP_INBOX",
        success: true,
        messageId: created.id,
      }
    } catch (err) {
      log.warn("Lỗi ghi nhận App Inbox notification", {
        userId: payload.recipient.userId,
        eventKey: payload.eventKey,
        error: err instanceof Error ? err.message : String(err),
      })
      return {
        channel: "APP_INBOX",
        success: false,
        error: err instanceof Error ? err.message : "Inbox creation failed",
      }
    }
  }
}
