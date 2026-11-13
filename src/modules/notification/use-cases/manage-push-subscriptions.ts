/**
 * Người dùng bật/tắt nhận Web Push trên thiết bị của mình (checklist 4.30). Chỉ thiết bị của chính người gọi
 * trong tổ chức của phiên; `organization_id` lấy từ `TenantContext`.
 */
import type { TenantContext } from "@/core/tenancy"
import { unprocessable } from "@/core/http/errors"
import { isProviderConfigured } from "../domain/channel-providers"
import { isAllowedPushEndpoint } from "../domain/web-push-rules"
import type { PushSubscriptionKeys } from "../adapters/web-push-protocol"
import { ChannelProviderStore, type IChannelProviderStore } from "../infra/channel-provider-store"
import { getNotificationPreferenceRepository } from "../infra/notification-preference-repository"
import { PushSubscriptionRepository } from "../infra/push-subscription-repository"

export interface PushStatus {
  /** Khoá công khai VAPID cho `pushManager.subscribe` — null khi tầng Mẹ chưa bật kênh. */
  public_key: string | null
  available: boolean
  devices: number
  subscribed: boolean
}

export async function getPushStatus(
  ctx: TenantContext,
  endpoint: string | null,
  deps: { store?: IChannelProviderStore; repo?: PushSubscriptionRepository } = {},
): Promise<PushStatus> {
  const store = deps.store ?? new ChannelProviderStore()
  const repo = deps.repo ?? new PushSubscriptionRepository()
  const [config, activations, devices, subscribed] = await Promise.all([
    store.get("PUSH"),
    getNotificationPreferenceRepository().getChannelActivations(),
    repo.countForCaller(ctx),
    endpoint ? repo.hasEndpointForCaller(ctx, endpoint) : Promise.resolve(false),
  ])
  const available = Boolean(config && isProviderConfigured("PUSH", config) && activations.PUSH === true)
  return { public_key: available ? config?.values.publicKey ?? null : null, available, devices, subscribed }
}

export async function subscribePush(ctx: TenantContext, sub: PushSubscriptionKeys, userAgent: string | null, repo = new PushSubscriptionRepository()): Promise<void> {
  if (!isAllowedPushEndpoint(sub.endpoint)) throw unprocessable("Trình duyệt này không dùng dịch vụ nhận tin được hỗ trợ")
  await repo.saveForCaller(ctx, sub, userAgent)
}

export async function unsubscribePush(ctx: TenantContext, endpoint: string, repo = new PushSubscriptionRepository()): Promise<boolean> {
  return repo.removeForCaller(ctx, endpoint)
}
