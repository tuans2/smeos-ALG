import type { Prisma, PrismaClient } from "@/generated/prisma/client"
import { prisma as defaultPrisma } from "@/core/tenancy/infra/prisma"
import type {
  IInternalChatRepository,
  CreateConversationParams,
  ListConversationsFilter,
  SendMessageParams,
} from "../domain/repositories/chat-repository.interface"
import type {
  InternalChatConversation,
  InternalChatMessage,
  InternalChatParticipant,
  ConversationType,
  InternalChatMessageKind,
  ParticipantRoleInChat,
} from "../domain/chat-entities"

export class PrismaInternalChatRepository implements IInternalChatRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async createConversation(params: CreateConversationParams): Promise<InternalChatConversation> {
    const row = await this.prisma.internal_chat_conversations.create({
      data: {
        organization_id: params.organizationId,
        conversation_type: params.conversationType,
        title: params.title ?? null,
        order_id: params.orderId ?? null,
        metadata: (params.metadata ?? {}) as never,
        created_by: params.createdBy,
        participants: {
          create: params.participantUserIds.map((p) => ({
            user_id: p.userId,
            organization_id: p.organizationId,
            role_in_chat: p.roleInChat ?? "MEMBER",
          })),
        },
      },
    })

    return this.mapConversation(row)
  }

  async findConversationById(conversationId: string): Promise<InternalChatConversation | null> {
    const row = await this.prisma.internal_chat_conversations.findUnique({
      where: { id: conversationId },
    })
    return row ? this.mapConversation(row) : null
  }

  async findConversationByOrderId(orderId: string): Promise<InternalChatConversation | null> {
    const row = await this.prisma.internal_chat_conversations.findFirst({
      where: { order_id: orderId },
      orderBy: { created_at: "desc" },
    })
    return row ? this.mapConversation(row) : null
  }

  async listConversations(filter: ListConversationsFilter): Promise<{ items: InternalChatConversation[]; total: number }> {
    const where: Prisma.internal_chat_conversationsWhereInput = {
      participants: {
        some: {
          user_id: filter.userId,
        },
      },
    }

    if (filter.conversationType) {
      where.conversation_type = filter.conversationType
    }
    if (filter.orderId) {
      where.order_id = filter.orderId
    }

    const [rows, total] = await Promise.all([
      this.prisma.internal_chat_conversations.findMany({
        where,
        orderBy: { last_message_at: "desc" },
        take: Math.min(filter.limit ?? 20, 100),
        skip: filter.offset ?? 0,
        include: {
          messages: {
            orderBy: { created_at: "desc" },
            take: 1,
          },
          participants: {
            where: { user_id: filter.userId },
          },
        },
      }),
      this.prisma.internal_chat_conversations.count({ where }),
    ])

    const items = rows.map((r) => {
      const conv = this.mapConversation(r)
      const lastMsg = r.messages[0]
      if (lastMsg) {
        conv.lastMessageSnippet = lastMsg.message_type === "TEXT" ? lastMsg.content : `[${lastMsg.message_type}]`
      }
      const participant = r.participants[0]
      if (participant) {
        conv.unreadCount = r.last_message_at > participant.last_read_at ? 1 : 0
      }
      return conv
    })

    return { items, total }
  }

  async getParticipants(conversationId: string): Promise<InternalChatParticipant[]> {
    const rows = await this.prisma.internal_chat_participants.findMany({
      where: { conversation_id: conversationId },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    })

    return rows.map((r) => ({
      id: r.id,
      conversationId: r.conversation_id,
      userId: r.user_id,
      organizationId: r.organization_id,
      roleInChat: r.role_in_chat as ParticipantRoleInChat,
      lastReadAt: r.last_read_at,
      isMuted: r.is_muted,
      joinedAt: r.joined_at,
      userName: r.user?.name ?? undefined,
      userEmail: r.user?.email ?? undefined,
    }))
  }

  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.internal_chat_participants.count({
      where: {
        conversation_id: conversationId,
        user_id: userId,
      },
    })
    return count > 0
  }

  async addParticipant(
    conversationId: string,
    participant: { userId: string; organizationId: string; roleInChat?: string | undefined }
  ): Promise<void> {
    await this.prisma.internal_chat_participants.upsert({
      where: {
        conversation_id_user_id: {
          conversation_id: conversationId,
          user_id: participant.userId,
        },
      },
      update: {
        role_in_chat: participant.roleInChat ?? "MEMBER",
      },
      create: {
        conversation_id: conversationId,
        user_id: participant.userId,
        organization_id: participant.organizationId,
        role_in_chat: participant.roleInChat ?? "MEMBER",
      },
    })
  }

  async sendMessage(params: SendMessageParams): Promise<InternalChatMessage> {
    const now = new Date()
    // organization_id sao từ hội thoại cha — khoá ghép giữ tin nhắn cùng tổ chức với hội thoại.
    const conversation = await this.prisma.internal_chat_conversations.findUniqueOrThrow({
      where: { id: params.conversationId },
      select: { organization_id: true },
    })
    const [msgRow] = await this.prisma.$transaction([
      this.prisma.internal_chat_messages.create({
        data: {
          conversation_id: params.conversationId,
          organization_id: conversation.organization_id,
          sender_user_id: params.senderUserId,
          sender_role: params.senderRole,
          message_type: params.messageType ?? "TEXT",
          content: params.content,
          attachments: (params.attachments ?? []) as never,
          action_payload: (params.actionPayload ?? {}) as never,
          created_at: now,
        },
        include: {
          sender: {
            select: { name: true },
          },
        },
      }),
      this.prisma.internal_chat_conversations.update({
        where: { id: params.conversationId },
        data: {
          last_message_at: now,
        },
      }),
      this.prisma.internal_chat_participants.updateMany({
        where: {
          conversation_id: params.conversationId,
          user_id: params.senderUserId,
        },
        data: {
          last_read_at: now,
        },
      }),
    ])

    return this.mapMessage(msgRow)
  }

  async listMessages(conversationId: string, limit = 50, before?: Date | undefined): Promise<InternalChatMessage[]> {
    const where: Prisma.internal_chat_messagesWhereInput = {
      conversation_id: conversationId,
      deleted_at: null,
    }
    if (before) {
      where.created_at = { lt: before }
    }

    const rows = await this.prisma.internal_chat_messages.findMany({
      where,
      orderBy: { created_at: "asc" },
      take: Math.min(limit, 100),
      include: {
        sender: {
          select: { name: true },
        },
      },
    })

    return rows.map((r) => this.mapMessage(r))
  }

  async markRead(conversationId: string, userId: string): Promise<void> {
    await this.prisma.internal_chat_participants.updateMany({
      where: {
        conversation_id: conversationId,
        user_id: userId,
      },
      data: {
        last_read_at: new Date(),
      },
    })
  }

  async findMessageById(messageId: string): Promise<InternalChatMessage | null> {
    const row = await this.prisma.internal_chat_messages.findUnique({ where: { id: messageId }, include: { sender: { select: { name: true } } } })
    return row ? this.mapMessage(row) : null
  }

  async updateActionPayload(messageId: string, newPayload: Record<string, unknown>): Promise<InternalChatMessage> {
    const row = await this.prisma.internal_chat_messages.update({
      where: { id: messageId },
      data: {
        action_payload: newPayload as Prisma.InputJsonValue,
      },
      include: {
        sender: {
          select: { name: true },
        },
      },
    })
    return this.mapMessage(row)
  }

  private mapConversation(row: Prisma.internal_chat_conversationsGetPayload<object>): InternalChatConversation {
    return {
      id: row.id,
      organizationId: row.organization_id,
      conversationType: row.conversation_type as ConversationType,
      title: row.title,
      orderId: row.order_id,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastMessageAt: row.last_message_at,
    }
  }

  private mapMessage(row: Prisma.internal_chat_messagesGetPayload<object> & { sender?: { name: string | null } | null }): InternalChatMessage {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      senderUserId: row.sender_user_id,
      senderRole: row.sender_role,
      senderName: row.sender?.name ?? undefined,
      messageType: row.message_type as InternalChatMessageKind,
      content: row.content,
      attachments: (row.attachments as string[]) ?? [],
      actionPayload: (row.action_payload as Record<string, unknown> | null) ?? {},
      isDeleted: row.deleted_at !== null,
      createdAt: row.created_at,
    }
  }
}

let defaultRepo: IInternalChatRepository | null = null

export function getInternalChatRepository(): IInternalChatRepository {
  if (!defaultRepo) {
    defaultRepo = new PrismaInternalChatRepository()
  }
  return defaultRepo
}
