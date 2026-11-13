/**
 * Sổ nhà cung cấp kênh liên lạc (checklist 4.30) — Console tầng Mẹ, năng lực `N2`.
 *
 * Đăng ký nhà cung cấp một lần cho cả hệ thống; bật/tắt dùng kênh vẫn qua `PATCH /platform/notification/channels`
 * và chính sách 4 tầng. Khoá bí mật không bao giờ trả lại — chỉ cho biết đã có hay chưa.
 */
import type { PlatformContext } from "@/core/platform/platform-context"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { unprocessable, validationFailed } from "@/core/http/errors"
import { recordPlatformAuditLog } from "@/modules/platform/infra/platform-audit-repository"
import {
  CHANNEL_PROVIDERS,
  PROVIDER_CHANNELS,
  maskProviderConfig,
  mergeProviderConfig,
  providerDefinition,
  type MaskedProviderConfig,
  type ProviderChannel,
  type ProviderConfig,
  type ProviderDefinition,
} from "../domain/channel-providers"
import { generateVapidKeys, vapidKeysValid } from "../adapters/web-push-protocol"
import { PushSubscriptionRepository } from "../infra/push-subscription-repository"
import type { ChannelSendResult } from "../domain/notification-payload"
import { ChannelProviderStore, type IChannelProviderStore } from "../infra/channel-provider-store"
import { getChannelAdapter } from "../infra/channel-adapters"
import { getNotificationPreferenceRepository } from "../infra/notification-preference-repository"

export interface ChannelProviderView extends MaskedProviderConfig {
  activated: boolean
}

export async function listChannelProviders(
  pctx: PlatformContext,
  store: IChannelProviderStore = new ChannelProviderStore(),
): Promise<{ catalog: readonly ProviderDefinition[]; channels: ChannelProviderView[] }> {
  requirePlatformCapability(pctx, "N2")
  const activations = await getNotificationPreferenceRepository().getChannelActivations()
  const channels = await Promise.all(
    PROVIDER_CHANNELS.map(async (channel) => ({ ...maskProviderConfig(channel, await store.get(channel)), activated: activations[channel] === true })),
  )
  return { catalog: CHANNEL_PROVIDERS, channels }
}

/** `provider: null` = gỡ nhà cung cấp của kênh. Ô bí mật để trống = giữ khoá đã lưu. */
export async function saveChannelProvider(
  pctx: PlatformContext,
  input: { channel: ProviderChannel; provider: string | null; values: Record<string, string> },
  store: IChannelProviderStore = new ChannelProviderStore(),
): Promise<MaskedProviderConfig> {
  requirePlatformCapability(pctx, "N2")
  const before = maskProviderConfig(input.channel, await store.get(input.channel))
  if (input.provider === null) {
    await store.save(input.channel, null)
  } else {
    const def = providerDefinition(input.channel, input.provider)
    if (!def) throw validationFailed({ provider: "Nhà cung cấp không thuộc kênh này" })
    const merged = await store.withLock(input.channel, async (current, save) => {
      const result = mergeProviderConfig(def, input.channel === "PUSH" ? withVapidKeys(input.values, current) : input.values, current)
      if ("config" in result) await save(result.config)
      return result
    })
    if ("errors" in merged) throw validationFailed(merged.errors)
  }
  const after = maskProviderConfig(input.channel, await store.get(input.channel))
  await recordPlatformAuditLog(pctx, { action: "platform.notification_provider.update", entityType: "platform_secrets", entityId: `notification_provider:${input.channel}`, before, after })
  return after
}

/**
 * Web Push: để trống cả hai khoá và chưa có khoá đã lưu → hệ thống tự tạo cặp khoá (đăng ký một lần, không phải
 * dùng công cụ ngoài). Nhập khoá tay thì cặp khoá phải khớp, nếu không mọi lần gửi đều bị dịch vụ đẩy từ chối.
 */
function withVapidKeys(values: Record<string, string>, current: ProviderConfig | null): Record<string, string> {
  const publicKey = (values.publicKey ?? "").trim()
  const privateKey = (values.privateKey ?? "").trim()
  const stored = current?.provider === "vapid" ? current.values : {}
  if (!publicKey && !privateKey) return stored.publicKey && stored.privateKey ? { ...values, publicKey: stored.publicKey } : { ...values, ...generateVapidKeys() }
  const pair = { publicKey: publicKey || stored.publicKey || "", privateKey: privateKey || stored.privateKey || "" }
  if (!vapidKeysValid(pair.publicKey, pair.privateKey)) throw validationFailed({ publicKey: "Cặp khoá VAPID không khớp nhau" })
  return values
}

/**
 * Gửi một tin thử — kiểm khoá trước khi bật kênh cho cả hệ thống. SMS / Zalo: tới số điện thoại người vận hành nhập.
 * Web Push: tới thiết bị chính người vận hành đã bật nhận tin (trong tổ chức họ là thành viên).
 */
export async function testChannelProvider(
  pctx: PlatformContext,
  input: { channel: ProviderChannel; phone?: string | undefined },
  devices: Pick<PushSubscriptionRepository, "organizationWithDeviceOf"> = new PushSubscriptionRepository(),
): Promise<ChannelSendResult> {
  requirePlatformCapability(pctx, "N2")
  const adapter = getChannelAdapter(input.channel)
  if (!adapter) throw unprocessable("Kênh chưa có bộ gửi")
  if (input.channel !== "PUSH" && !input.phone) throw validationFailed({ phone: "Cần số điện thoại nhận tin thử" })
  const organizationId = input.channel === "PUSH" ? (await devices.organizationWithDeviceOf(pctx.userId)) ?? "" : ""
  const result = await adapter.send({
    eventKey: "platform.notification_provider.test",
    recipient: { userId: pctx.userId, roleKey: "platform", organizationId, phone: input.phone },
    title: "Tin thử",
    message: "Kênh liên lạc đã kết nối thành công.",
  })
  await recordPlatformAuditLog(pctx, { action: "platform.notification_provider.test", entityType: "platform_secrets", entityId: `notification_provider:${input.channel}`, after: { success: result.success } })
  return result
}
