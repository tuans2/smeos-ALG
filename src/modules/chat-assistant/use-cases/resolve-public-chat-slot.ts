/**
 * Trang công khai có được vẽ khung chat AI không. Chỉ vẽ khi kênh của trang
 * đang bật (còn hạn) và chủ tiệm không tắt khung chat cho loại trang đó.
 * Trang bị tắt thì không hiện gì — không vẽ rồi báo lỗi.
 */
import { isChannelSubscriptionActive } from "../domain/channel-integration-rules"
import type { ChannelConfig, SupportedChatChannel } from "../domain/channel-integration-types"
import {
  isChannelEnabledByDefault,
  isSurfaceAllowed,
  surfaceChannel,
  type PublicChatSurface,
} from "../domain/public-chat-policy"
import type { PublicChatOwner } from "../infra/public-chat-owner-repository"

export interface PublicChatSlot {
  shopSlug: string
  shopName: string
  surface: PublicChatSurface
}

export type ChannelConfigReader = (
  organizationId: string,
  channel: SupportedChatChannel,
) => Promise<{ isEnabled: boolean; config: ChannelConfig; subscriptionExpiresAt?: string | null | undefined } | null>

export async function resolvePublicChatSlot(
  owner: PublicChatOwner | null,
  surface: PublicChatSurface,
  readChannel: ChannelConfigReader,
): Promise<PublicChatSlot | null> {
  if (!owner) return null
  const channel = surfaceChannel(surface)
  const row = await readChannel(owner.organizationId, channel)
  const isEnabled = row?.isEnabled ?? isChannelEnabledByDefault(channel)
  const expiresAt = row?.subscriptionExpiresAt ? new Date(row.subscriptionExpiresAt) : null
  if (!isChannelSubscriptionActive(channel, isEnabled, expiresAt)) return null
  if (!isSurfaceAllowed(row?.config, surface)) return null
  return { shopSlug: owner.shopSlug, shopName: owner.shopName, surface }
}

/** Khoá công khai của trang đang hiển thị — dùng để suy ra tiệm sở hữu. */
export type PublicPageKey =
  | { by: "catalog_slug"; value: string }
  | { by: "store_share_slug"; value: string }
  | { by: "org_slug"; value: string }
  | { by: "send_code"; value: string }

/** Bản đầy đủ cho trang máy chủ; lỗi tra cứu không được làm hỏng trang khách. */
export async function loadPublicChatSlot(key: PublicPageKey, surface: PublicChatSurface): Promise<PublicChatSlot | null> {
  const owners = await import("../infra/public-chat-owner-repository")
  const { getChatChannelRepository } = await import("../infra/chat-channel-repository")
  const finders = {
    catalog_slug: owners.findOwnerByCatalogSlug,
    store_share_slug: owners.findOwnerByStoreShareSlug,
    org_slug: owners.findOwnerByOrgSlug,
    send_code: owners.findOwnerBySendCode,
  } as const
  try {
    const repo = getChatChannelRepository()
    return await resolvePublicChatSlot(await finders[key.by](key.value), surface, (orgId, channel) =>
      repo.getChannelConfigForOrg(orgId, channel),
    )
  } catch {
    return null
  }
}
