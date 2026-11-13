/**
 * SMS NOTIFICATION ADAPTER
 *
 * Kênh SMS Brandname qua nhà cung cấp đăng ký một lần ở tầng Mẹ (checklist 4.30). Chưa đăng ký đủ cấu hình
 * → `NOT_CONFIGURED`, không gọi ra ngoài, không báo đã gửi.
 *
 * @module notification/infra/channel-adapters
 */
import { log } from "@/core/observability/log"
import { sendEsmsMessage } from "@/modules/greeting-card/adapters/esms-adapter"
import { toInternationalPhone } from "@/modules/greeting-card/domain/customer-notifications"
import { NOT_CONFIGURED_ERROR, type INotificationChannelAdapter } from "./_channel-adapter.interface"
import { absoluteDeepLink, providerRequestId } from "./provider-send-context"
import { isProviderConfigured } from "../../domain/channel-providers"
import { smsPlainText } from "../../domain/notification-text"
import type { NotificationPayload, ChannelSendResult } from "../../domain/notification-payload"
import { ChannelProviderStore, type IChannelProviderStore } from "../channel-provider-store"

export const NO_PHONE_ERROR = "Người nhận chưa có số điện thoại di động hợp lệ"

export class SmsNotificationAdapter implements INotificationChannelAdapter {
  readonly channel = "SMS" as const

  constructor(
    private readonly store: IChannelProviderStore = new ChannelProviderStore(),
    private readonly sendEsms: typeof sendEsmsMessage = sendEsmsMessage,
  ) {}

  async send(payload: NotificationPayload): Promise<ChannelSendResult> {
    const config = await this.store.get("SMS")
    if (!config || !isProviderConfigured("SMS", config)) {
      log.info("SMS notification dispatch skipped: channel not configured", { userId: payload.recipient.userId, eventKey: payload.eventKey })
      return { channel: "SMS", success: false, error: NOT_CONFIGURED_ERROR }
    }
    const phone = toInternationalPhone(payload.recipient.phone)
    if (!phone) return { channel: "SMS", success: false, error: NO_PHONE_ERROR }
    try {
      const { apiKey = "", secretKey = "", brandname = "" } = config.values
      const content = smsPlainText({ title: payload.title, message: payload.message, link: absoluteDeepLink(payload) })
      const sent = await this.sendEsms({ creds: { apiKey, secretKey, brandname }, phone, content, requestId: providerRequestId(payload) })
      return { channel: "SMS", success: true, ...(sent.messageId ? { messageId: sent.messageId } : {}) }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gửi SMS thất bại"
      log.warn("SMS notification dispatch failed", { userId: payload.recipient.userId, eventKey: payload.eventKey, error: message })
      return { channel: "SMS", success: false, error: message }
    }
  }
}
