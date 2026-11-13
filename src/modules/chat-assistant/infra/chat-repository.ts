/**
 * Chat Repository (Infra).
 * Phân lập hoàn toàn theo organization_id (Tenant Isolation).
 */

import type { Prisma, chat_conversations, chat_messages } from "@/generated/prisma/client"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { ChatConversation, ChatMessage, ChatChannel, ChatSenderType } from "../domain/chat-types"

export class ChatRepository {
  async createConversation(
    ctx: TenantContext,
    title = "Hội thoại tư vấn hoa",
    channel: ChatChannel = "WEB_WIDGET",
    customerId?: string | undefined
  ): Promise<ChatConversation> {
    const row = await prisma.chat_conversations.create({
      data: {
        organization_id: ctx.organizationId,
        title,
        channel,
        customer_id: customerId ?? null,
        status: "ACTIVE",
      },
    })
    return this.mapConversation(row)
  }

  async getConversation(ctx: TenantContext, id: string): Promise<ChatConversation | null> {
    const row = await prisma.chat_conversations.findFirst({
      where: { id, organization_id: ctx.organizationId },
    })
    if (!row) return null
    return this.mapConversation(row)
  }

  async listConversations(
    ctx: TenantContext,
    status = "ACTIVE",
    limit = 50
  ): Promise<ChatConversation[]> {
    const rows = await prisma.chat_conversations.findMany({
      where: { organization_id: ctx.organizationId, status },
      orderBy: { updated_at: "desc" },
      take: limit,
    })
    return rows.map((r) => this.mapConversation(r))
  }

  async addMessage(
    ctx: TenantContext,
    conversationId: string,
    senderType: ChatSenderType,
    content: string,
    metadata?: Record<string, unknown> | undefined
  ): Promise<ChatMessage> {
    const [msgRow] = await prisma.$transaction([
      prisma.chat_messages.create({
        data: {
          organization_id: ctx.organizationId,
          conversation_id: conversationId,
          sender_type: senderType,
          content,
          ...(metadata ? { metadata: metadata as Prisma.InputJsonObject } : {}),
        },
      }),
      prisma.chat_conversations.update({
        where: { id: conversationId },
        data: { updated_at: new Date() },
      }),
    ])

    return this.mapMessage(msgRow)
  }

  async getMessages(
    ctx: TenantContext,
    conversationId: string,
    limit = 100
  ): Promise<ChatMessage[]> {
    const rows = await prisma.chat_messages.findMany({
      where: { organization_id: ctx.organizationId, conversation_id: conversationId },
      orderBy: { created_at: "asc" },
      take: limit,
    })
    return rows.map((r) => this.mapMessage(r))
  }

  private mapConversation(row: chat_conversations): ChatConversation {
    return {
      id: row.id,
      organizationId: row.organization_id,
      customerId: row.customer_id ?? undefined,
      title: row.title,
      channel: row.channel as ChatChannel,
      status: row.status as "ACTIVE" | "CLOSED",
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    }
  }

  private mapMessage(row: chat_messages): ChatMessage {
    return {
      id: row.id,
      organizationId: row.organization_id,
      conversationId: row.conversation_id,
      senderType: row.sender_type as ChatSenderType,
      content: row.content,
      metadata: (row.metadata as ChatMessage["metadata"]) ?? undefined,
      createdAt: row.created_at.toISOString(),
    }
  }
}

let _chatRepo: ChatRepository | null = null
export function getChatRepository(): ChatRepository {
  if (!_chatRepo) _chatRepo = new ChatRepository()
  return _chatRepo
}
