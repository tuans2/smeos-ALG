/**
 * Chat Channel Integration Repository (Infra).
 * Quản lý lưu trữ cấu hình kênh tích hợp, cách ly theo TenantContext.
 */

import { OrganizationRepository } from "@/modules/organization/infra/organization-repository"
import type { Prisma, chat_channel_integrations } from "@/generated/prisma/client"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { TenantContext } from "@/core/tenancy"
import type {
  ChatChannelIntegration,
  SupportedChatChannel,
  ChannelConfig,
} from "../domain/channel-integration-types"
import { openChannelConfig, sealChannelConfig, type StoredChannelConfig } from "./channel-config-vault"

/** Đối tượng thuần (cấu hình kênh, metadata tin nhắn) → giá trị cột Json của Prisma. */
function toJson(value: object): Prisma.InputJsonObject {
  return value as Prisma.InputJsonObject
}

export class ChatChannelRepository {
  async findByChannel(
    ctx: TenantContext,
    channel: SupportedChatChannel
  ): Promise<ChatChannelIntegration | null> {
    const row = await prisma.chat_channel_integrations.findUnique({
      where: {
        organization_id_channel: {
          organization_id: ctx.organizationId,
          channel,
        },
      },
    })

    if (!row) return null
    return this.mapToDomain(row)
  }

  async listAll(ctx: TenantContext): Promise<ChatChannelIntegration[]> {
    const rows = await prisma.chat_channel_integrations.findMany({
      where: {
        organization_id: ctx.organizationId,
      },
      orderBy: { created_at: "asc" },
    })

    return rows.map((r) => this.mapToDomain(r))
  }

  async upsertChannel(
    ctx: TenantContext,
    input: {
      channel: SupportedChatChannel
      isEnabled: boolean
      config: ChannelConfig
      subscriptionExpiresAt?: Date | null
    }
  ): Promise<ChatChannelIntegration> {
    const row = await prisma.chat_channel_integrations.upsert({
      where: {
        organization_id_channel: {
          organization_id: ctx.organizationId,
          channel: input.channel,
        },
      },
      create: {
        organization_id: ctx.organizationId,
        channel: input.channel,
        is_enabled: input.isEnabled,
        config: toJson(sealChannelConfig(input.config)),
        subscription_expires_at: input.subscriptionExpiresAt ?? null,
      },
      update: {
        is_enabled: input.isEnabled,
        config: toJson(sealChannelConfig(input.config)),
        ...(input.subscriptionExpiresAt !== undefined
          ? { subscription_expires_at: input.subscriptionExpiresAt }
          : {}),
      },
    })

    return this.mapToDomain(row)
  }

  // Phương thức tra cứu phục vụ Webhook công khai từ Facebook Messenger
  async findActiveByFbPageId(fbPageId: string): Promise<ChatChannelIntegration | null> {
    const rows = await prisma.chat_channel_integrations.findMany({
      where: {
        channel: "FACEBOOK_MESSENGER",
        is_enabled: true,
      },
    })

    const found = rows.find((r) => {
      const cfg = (r.config as ChannelConfig | null) ?? {}
      return cfg.fbPageId === fbPageId
    })

    return found ? this.mapToDomain(found) : null
  }

  // Phương thức tra cứu phục vụ Webhook công khai từ Zalo OA
  async findActiveByZaloOaId(zaloOaId: string): Promise<ChatChannelIntegration | null> {
    const rows = await prisma.chat_channel_integrations.findMany({
      where: {
        channel: "ZALO_OA",
        is_enabled: true,
      },
    })

    const found = rows.find((r) => {
      const cfg = (r.config as ChannelConfig | null) ?? {}
      return cfg.zaloOaId === zaloOaId
    })

    return found ? this.mapToDomain(found) : null
  }

  async getChannelConfigForOrg(
    organizationId: string,
    channel: SupportedChatChannel
  ): Promise<ChatChannelIntegration | null> {
    const row = await prisma.chat_channel_integrations.findUnique({
      where: {
        organization_id_channel: {
          organization_id: organizationId,
          channel,
        },
      },
    })
    return row ? this.mapToDomain(row) : null
  }

  async checkAndDeductUsageCredit(
    organizationId: string,
    costCredit: number,
    channel: SupportedChatChannel,
    senderId: string
  ): Promise<boolean> {
    // Sổ `usage` cần workspace thật (khoá ngoại `usage_workspace_id_fkey`, 05/11/2026). Trước 08/11/2026 dòng này ghi
    // `workspace_id: "system"` — không có workspace mã đó, nên mọi lượt trả lời đã trừ credit rồi mới vỡ khi ghi sổ
    // (khách nhận lỗi, credit mất). Tra workspace mặc định TRƯỚC khi trừ; tổ chức không có workspace → không trừ.
    const workspace = await prisma.workspaces.findFirst({
      where: { organization_id: organizationId },
      orderBy: { created_at: "asc" },
      select: { id: true },
    })
    if (!workspace) return false

    // Trừ có điều kiện (chống đua) và ghi sổ cái credit (checklist ALG 10.6)
    // Chạm hạn mức tháng cũng coi như hết credit: bot dừng, mời nhân viên trả lời tay
    const deducted = await new OrganizationRepository()
      .tryDeductCreditFor(organizationId, costCredit, { service: "CHAT", reason: `Trả lời AI qua ${channel}` })
      .catch(() => false)
    if (!deducted) return false

    await prisma.usage.create({
      data: {
        organization_id: organizationId,
        workspace_id: workspace.id,
        user_id: "customer",
        feature: "chat.message.ai_reply",
        cost_credit: costCredit,
        status: "COMPLETED",
        metadata: {
          channel,
          senderId,
        },
      },
    })

    return true
  }

  async findOrCreateChannelConversation(
    organizationId: string,
    channel: SupportedChatChannel,
    externalSenderId: string
  ): Promise<string> {
    let conversation = await prisma.chat_conversations.findFirst({
      where: {
        organization_id: organizationId,
        channel,
        title: `Khách: ${externalSenderId}`,
        status: "ACTIVE",
      },
    })

    if (!conversation) {
      conversation = await prisma.chat_conversations.create({
        data: {
          organization_id: organizationId,
          channel,
          title: `Khách: ${externalSenderId}`,
          status: "ACTIVE",
        },
      })
    }

    return conversation.id
  }

  async saveChannelMessage(
    organizationId: string,
    conversationId: string,
    senderType: "USER" | "ASSISTANT",
    content: string,
    metadata?: Record<string, unknown> | undefined
  ): Promise<void> {
    await prisma.chat_messages.create({
      data: {
        organization_id: organizationId,
        conversation_id: conversationId,
        sender_type: senderType,
        content,
        ...(metadata ? { metadata: toJson(metadata) } : {}),
      },
    })
  }

  private mapToDomain(row: chat_channel_integrations): ChatChannelIntegration {
    return {
      id: row.id,
      organizationId: row.organization_id,
      channel: row.channel as SupportedChatChannel,
      isEnabled: row.is_enabled,
      config: openChannelConfig(row.config as StoredChannelConfig | null),
      subscriptionExpiresAt: row.subscription_expires_at
        ? new Date(row.subscription_expires_at).toISOString()
        : null,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    }
  }
}

let _chatChannelRepo: ChatChannelRepository | null = null
export function getChatChannelRepository(): ChatChannelRepository {
  if (!_chatChannelRepo) _chatChannelRepo = new ChatChannelRepository()
  return _chatChannelRepo
}
