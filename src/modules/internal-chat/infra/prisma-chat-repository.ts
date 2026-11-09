import type { Prisma, PrismaClient } from "@/generated/prisma/client"
import { prisma as defaultPrisma } from "@/core/tenancy/infra/prisma"
import { ACTIVE_CHAIN_LINK } from "@/modules/organization/infra/organization-links"
import type {
  IInternalChatRepository,
  CreateConversationParams,
  ListConversationsFilter,
  MessagePage,
  SendMessageParams,
} from "../domain/repositories/chat-repository.interface"
import type {
  InternalChatConversation,
  InternalChatMessage,
  InternalChatParticipant,
  ConversationType,
  ParticipantRoleInChat,
} from "../domain/chat-entities"
import type { MessageCursor } from "../domain/message-cursor"
import { PrismaChatMessageStore } from "./prisma-chat-message-repository"

export class PrismaInternalChatRepository implements IInternalChatRepository {
  private readonly messageStore: PrismaChatMessageStore

  constructor(private readonly prisma: PrismaClient = defaultPrisma) {
    this.messageStore = new PrismaChatMessageStore(prisma)
  }

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

  async findConversationByOrderId(organizationId: string, orderId: string): Promise<InternalChatConversation | null> {
    const row = await this.prisma.internal_chat_conversations.findFirst({
      where: { organization_id: organizationId, order_id: orderId },
      orderBy: { created_at: "desc" },
    })
    return row ? this.mapConversation(row) : null
  }

  async findDirectConversation(
    organizationId: string,
    conversationType: ConversationType,
    userIds: [string, string]
  ): Promise<InternalChatConversation | null> {
    const row = await this.prisma.internal_chat_conversations.findFirst({
      where: {
        organization_id: organizationId,
        conversation_type: conversationType,
        order_id: null,
        AND: userIds.map((userId) => ({ participants: { some: { user_id: userId } } })),
      },
      orderBy: { created_at: "asc" },
    })
    return row ? this.mapConversation(row) : null
  }

  async listConversations(filter: ListConversationsFilter): Promise<{ items: InternalChatConversation[]; total: number }> {
    // Chỉ phòng của ngữ cảnh tổ chức hiện tại: của chính tổ chức, hoặc của tổ chức đang liên kết ACTIVE với nó
    const where: Prisma.internal_chat_conversationsWhereInput = {
      participants: { some: { user_id: filter.userId, organization_id: filter.organizationId } },
      OR: [
        { organization_id: filter.organizationId },
        { organization: { organization_links_as_parent: { some: { child_org_id: filter.organizationId, ...ACTIVE_CHAIN_LINK } } } },
        { organization: { organization_links_as_child: { some: { parent_org_id: filter.organizationId, ...ACTIVE_CHAIN_LINK } } } },
      ],
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
            where: { deleted_at: null },
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

    const lastRead = new Map<string, Date>()
    for (const r of rows) if (r.participants[0]) lastRead.set(r.id, r.participants[0].last_read_at)
    const unread = await this.messageStore.countUnread(filter.userId, lastRead)

    const items = rows.map((r) => {
      const conv = this.mapConversation(r)
      const lastMsg = r.messages[0]
      if (lastMsg) {
        conv.lastMessageSnippet = lastMsg.message_type === "TEXT" ? lastMsg.content : `[${lastMsg.message_type}]`
      }
      conv.unreadCount = unread.get(r.id) ?? 0
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

  sendMessage(params: SendMessageParams): Promise<InternalChatMessage> {
    return this.messageStore.send(params)
  }

  findMessageById(messageId: string): Promise<InternalChatMessage | null> {
    return this.messageStore.findById(messageId)
  }

  listMessages(conversationId: string, limit?: number | undefined, before?: MessageCursor | undefined): Promise<MessagePage> {
    return this.messageStore.listPage(conversationId, limit, before)
  }

  markRead(conversationId: string, userId: string): Promise<void> {
    return this.messageStore.markRead(conversationId, userId)
  }

  updateCardIfStatus(messageId: string, expectedStatus: string, patch: Record<string, unknown>): Promise<InternalChatMessage | null> {
    return this.messageStore.updateCardIfStatus(messageId, expectedStatus, patch)
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
}

let defaultRepo: IInternalChatRepository | null = null

export function getInternalChatRepository(): IInternalChatRepository {
  if (!defaultRepo) {
    defaultRepo = new PrismaInternalChatRepository()
  }
  return defaultRepo
}
