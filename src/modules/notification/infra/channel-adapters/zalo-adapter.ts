/**
 * ZALO NOTIFICATION ADAPTER
 *
 * Kênh Zalo ZNS (tin theo mẫu đã duyệt, gửi theo số điện thoại) qua nhà cung cấp đăng ký một lần ở tầng Mẹ
 * (checklist 4.30). Chưa đăng ký đủ cấu hình → `NOT_CONFIGURED`. Refresh token Zalo dùng MỘT lần: khi access
 * token sắp hết hạn, việc làm mới + gửi chạy dưới khoá dòng để hai tiến trình không dùng lại token đã huỷ.
 *
 * @module notification/infra/channel-adapters
 */
import { log } from "@/core/observability/log"
import { sendZnsMessage, type ZnsCredentials } from "@/modules/greeting-card/adapters/zalo-zns-adapter"
import { toInternationalPhone } from "@/modules/greeting-card/domain/customer-notifications"
import { NOT_CONFIGURED_ERROR, type INotificationChannelAdapter } from "./_channel-adapter.interface"
import { absoluteDeepLink, providerRequestId } from "./provider-send-context"
import { NO_PHONE_ERROR } from "./sms-adapter"
import { isProviderConfigured, type ProviderConfig } from "../../domain/channel-providers"
import type { NotificationPayload, ChannelSendResult } from "../../domain/notification-payload"
import { ChannelProviderStore, type IChannelProviderStore } from "../channel-provider-store"

const REFRESH_MARGIN_MS = 5 * 60_000

function credsOf(config: ProviderConfig): ZnsCredentials {
  const v = config.values
  return {
    appId: v.appId ?? "",
    secretKey: v.secretKey ?? "",
    accessToken: v.accessToken ?? "",
    refreshToken: v.refreshToken ?? "",
    accessTokenExpiresAt: v.accessTokenExpiresAt ?? null,
  }
}

function tokenFresh(config: ProviderConfig): boolean {
  const at = config.values.accessTokenExpiresAt ? Date.parse(config.values.accessTokenExpiresAt) : 0
  return Boolean(at) && at > Date.now() + REFRESH_MARGIN_MS
}

export class ZaloNotificationAdapter implements INotificationChannelAdapter {
  readonly channel = "ZALO" as const

  constructor(
    private readonly store: IChannelProviderStore = new ChannelProviderStore(),
    private readonly sendZns: typeof sendZnsMessage = sendZnsMessage,
  ) {}

  async send(payload: NotificationPayload): Promise<ChannelSendResult> {
    const config = await this.store.get("ZALO")
    if (!config || !isProviderConfigured("ZALO", config)) {
      log.info("Zalo notification dispatch skipped: channel not configured", { userId: payload.recipient.userId, eventKey: payload.eventKey })
      return { channel: "ZALO", success: false, error: NOT_CONFIGURED_ERROR }
    }
    const phone = toInternationalPhone(payload.recipient.phone)
    if (!phone) return { channel: "ZALO", success: false, error: NO_PHONE_ERROR }
    try {
      const messageId = tokenFresh(config)
        ? await this.sendWith(config, payload, phone, null)
        : await this.store.withLock("ZALO", (current, save) => this.sendWith(current ?? config, payload, phone, save))
      return { channel: "ZALO", success: true, ...(messageId ? { messageId } : {}) }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gửi Zalo thất bại"
      log.warn("Zalo notification dispatch failed", { userId: payload.recipient.userId, eventKey: payload.eventKey, error: message })
      return { channel: "ZALO", success: false, error: message }
    }
  }

  private async sendWith(
    config: ProviderConfig,
    payload: NotificationPayload,
    phone: string,
    save: ((next: ProviderConfig) => Promise<void>) | null,
  ): Promise<string | null> {
    const v = config.values
    const link = absoluteDeepLink(payload)
    const params: Record<string, string> = {
      [v.titleParam || "title"]: payload.title,
      [v.messageParam || "message"]: link ? `${payload.message} ${link}` : payload.message,
    }
    const result = await this.sendZns({ creds: credsOf(config), templateId: v.templateId ?? "", phone, params, trackingId: providerRequestId(payload) })
    if (result.updatedCredentials) {
      const u = result.updatedCredentials
      const next: ProviderConfig = {
        ...config,
        values: { ...v, accessToken: u.accessToken, refreshToken: u.refreshToken, accessTokenExpiresAt: u.accessTokenExpiresAt ?? "" },
      }
      if (save) await save(next)
      else await this.store.withLock("ZALO", (_current, write) => write(next))
    }
    return result.messageId
  }
}
