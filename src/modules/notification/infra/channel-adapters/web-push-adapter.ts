/**
 * WEB PUSH CHANNEL ADAPTER
 *
 * Gửi thông báo tới trình duyệt đã đồng ý nhận tin (checklist 4.30). Khoá VAPID do tầng Mẹ đăng ký một lần ở sổ
 * nhà cung cấp; thiết bị lưu ở `push_subscriptions`. Chưa cấu hình → `NOT_CONFIGURED`. Thiết bị dịch vụ đẩy báo
 * đã huỷ (404/410) bị xoá. Thành công khi ít nhất một thiết bị nhận.
 *
 * @module notification/infra/channel-adapters
 */
import { log } from "@/core/observability/log"
import { NOT_CONFIGURED_ERROR, type INotificationChannelAdapter } from "./_channel-adapter.interface"
import { encryptPushPayload, vapidAuthorization } from "../../adapters/web-push-protocol"
import { isProviderConfigured } from "../../domain/channel-providers"
import type { NotificationPayload, ChannelSendResult } from "../../domain/notification-payload"
import { isAllowedPushEndpoint, webPushMessage, webPushUrgency } from "../../domain/web-push-rules"
import { ChannelProviderStore, type IChannelProviderStore } from "../channel-provider-store"
import { PushSubscriptionRepository } from "../push-subscription-repository"

export const NO_DEVICE_ERROR = "Người nhận chưa bật nhận tin trên thiết bị nào"
const TIMEOUT_MS = 10_000
const TTL_SECONDS = 24 * 3600

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>
type Devices = Pick<PushSubscriptionRepository, "listForRecipient" | "removeExpired" | "markSuccess">

export class WebPushNotificationAdapter implements INotificationChannelAdapter {
  readonly channel = "PUSH" as const

  constructor(
    private readonly store: IChannelProviderStore = new ChannelProviderStore(),
    private readonly devices: Devices = new PushSubscriptionRepository(),
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async send(payload: NotificationPayload): Promise<ChannelSendResult> {
    const config = await this.store.get("PUSH")
    if (!config || !isProviderConfigured("PUSH", config)) {
      log.info("Web push dispatch skipped: channel not configured", { userId: payload.recipient.userId, eventKey: payload.eventKey })
      return { channel: "PUSH", success: false, error: NOT_CONFIGURED_ERROR }
    }
    const { organizationId, userId } = payload.recipient
    const subs = organizationId ? await this.devices.listForRecipient(organizationId, userId) : []
    if (subs.length === 0) return { channel: "PUSH", success: false, error: NO_DEVICE_ERROR }

    const vapid = { publicKey: config.values.publicKey ?? "", privateKey: config.values.privateKey ?? "", subject: config.values.subject ?? "" }
    const message = Buffer.from(webPushMessage(payload))
    let delivered = 0
    let lastError = "Dịch vụ đẩy từ chối"
    for (const sub of subs) {
      if (!isAllowedPushEndpoint(sub.endpoint)) {
        await this.devices.removeExpired(organizationId, sub.id)
        continue
      }
      try {
        const res = await this.fetchImpl(sub.endpoint, {
          method: "POST",
          signal: AbortSignal.timeout(TIMEOUT_MS),
          headers: {
            Authorization: vapidAuthorization(sub.endpoint, vapid),
            "Content-Encoding": "aes128gcm",
            "Content-Type": "application/octet-stream",
            TTL: String(TTL_SECONDS),
            Urgency: webPushUrgency(payload.priority),
          },
          body: new Uint8Array(encryptPushPayload(sub, message)),
        })
        if (res.status === 404 || res.status === 410) {
          await this.devices.removeExpired(organizationId, sub.id)
        } else if (res.ok) {
          delivered++
          await this.devices.markSuccess(organizationId, sub.id)
        } else {
          lastError = `Dịch vụ đẩy từ chối (${res.status})`
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Gửi tin đẩy thất bại"
      }
    }
    if (delivered > 0) return { channel: "PUSH", success: true }
    log.warn("Web push dispatch failed", { userId, eventKey: payload.eventKey, devices: subs.length, error: lastError })
    return { channel: "PUSH", success: false, error: lastError }
  }
}
