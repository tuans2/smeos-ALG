/**
 * Tin nhắn từ khung chat AI trên trang công khai do công cụ ALG tạo ra.
 * Tổ chức suy từ slug; kiểm trang có được bật khung chat, áp hạn mức chống spam
 * (theo khách và theo IP, tách riêng từng tiệm) rồi chuyển cho luồng xử lý kênh.
 */
import { notFound } from "@/core/http/errors"
import { OrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { getChatChannelRepository } from "../infra/chat-channel-repository"
import {
  isSurfaceAllowed,
  resolvePublicChatLimits,
  surfaceChannel,
  type PublicChatLimits,
  type PublicChatSurface,
} from "../domain/public-chat-policy"
import type { ChannelConfig, SupportedChatChannel } from "../domain/channel-integration-types"
import { handleIncomingChannelMessage, type HandleChannelMessageResult } from "./handle-incoming-channel-message"

export interface PublicWidgetMessageInput {
  slug: string
  surface: PublicChatSurface
  visitorId: string
  message: string
}

/** Ném lỗi `RATE_LIMITED` khi vượt hạn mức (cài đặt thật: `enforceRateLimit`). */
export type PublicChatRateLimiter = (
  rule: { scope: string; limit: number; windowMs: number; subject?: string },
) => Promise<void>

export interface PublicWidgetDeps {
  findOrgBySlug: (slug: string) => Promise<{ id: string } | null>
  getChannelConfig: (
    organizationId: string,
    channel: SupportedChatChannel,
  ) => Promise<{ config: ChannelConfig } | null>
  rateLimit: PublicChatRateLimiter
  handleMessage: typeof handleIncomingChannelMessage
}

export async function enforcePublicChatLimits(
  rateLimit: PublicChatRateLimiter,
  organizationId: string,
  visitorId: string,
  limits: PublicChatLimits,
): Promise<void> {
  await rateLimit({ scope: `public-chat-ip:${organizationId}`, limit: limits.perIp, windowMs: limits.windowMs })
  await rateLimit({
    scope: `public-chat-visitor:${organizationId}`,
    limit: limits.perVisitor,
    windowMs: limits.windowMs,
    subject: visitorId,
  })
}

export async function handlePublicWidgetMessage(
  input: PublicWidgetMessageInput,
  deps: PublicWidgetDeps,
): Promise<HandleChannelMessageResult> {
  const org = await deps.findOrgBySlug(input.slug)
  if (!org) throw notFound()

  const channel = surfaceChannel(input.surface)
  const channelConfig = await deps.getChannelConfig(org.id, channel)
  if (!isSurfaceAllowed(channelConfig?.config, input.surface)) {
    throw notFound()
  }

  await enforcePublicChatLimits(deps.rateLimit, org.id, input.visitorId, resolvePublicChatLimits(channelConfig?.config))

  return deps.handleMessage({
    organizationId: org.id,
    channel,
    externalSenderId: input.visitorId,
    messageText: input.message,
  })
}

export function defaultPublicWidgetDeps(rateLimit: PublicChatRateLimiter): PublicWidgetDeps {
  const orgRepo = new OrganizationRepository()
  const channelRepo = getChatChannelRepository()
  return {
    findOrgBySlug: (slug) => orgRepo.findBySlug(slug),
    getChannelConfig: (orgId, channel) => channelRepo.getChannelConfigForOrg(orgId, channel),
    rateLimit,
    handleMessage: handleIncomingChannelMessage,
  }
}
