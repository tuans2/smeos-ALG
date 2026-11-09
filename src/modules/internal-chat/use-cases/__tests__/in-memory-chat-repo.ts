import type {
  CreateConversationParams,
  IChatLinkPolicy,
  IInternalChatRepository,
  ListConversationsFilter,
  MessagePage,
  SendMessageParams,
} from "../../domain/chat-repository.interface"
import type { ConversationType, InternalChatConversation, InternalChatMessage, InternalChatParticipant } from "../../domain/chat-entities"
import type { MessageCursor } from "../../domain/message-cursor"

/** Repository chat trong bộ nhớ cho unit test use-case — mô phỏng đúng các hợp đồng của port. */
export class InMemoryChatRepository implements IInternalChatRepository {
  conversations: InternalChatConversation[] = []
  participants: InternalChatParticipant[] = []
  messages: InternalChatMessage[] = []
  readMarks: { conversationId: string; userId: string }[] = []
  private seq = 0

  private nextId(prefix: string): string {
    this.seq += 1
    return `${prefix}-${this.seq}`
  }

  async createConversation(params: CreateConversationParams): Promise<InternalChatConversation> {
    const conv: InternalChatConversation = {
      id: this.nextId("conv"),
      organizationId: params.organizationId,
      conversationType: params.conversationType,
      title: params.title ?? null,
      orderId: params.orderId ?? null,
      metadata: params.metadata ?? {},
      createdBy: params.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMessageAt: new Date(),
    }
    this.conversations.push(conv)
    for (const p of params.participantUserIds) await this.addParticipant(conv.id, p)
    return conv
  }

  async findConversationById(id: string): Promise<InternalChatConversation | null> {
    return this.conversations.find((c) => c.id === id) ?? null
  }

  async findConversationByOrderId(organizationId: string, orderId: string): Promise<InternalChatConversation | null> {
    return this.conversations.find((c) => c.organizationId === organizationId && c.orderId === orderId) ?? null
  }

  async findDirectConversation(organizationId: string, type: ConversationType, userIds: [string, string]): Promise<InternalChatConversation | null> {
    return (
      this.conversations.find(
        (c) =>
          c.organizationId === organizationId &&
          c.conversationType === type &&
          !c.orderId &&
          userIds.every((u) => this.participants.some((p) => p.conversationId === c.id && p.userId === u))
      ) ?? null
    )
  }

  async listConversations(filter: ListConversationsFilter): Promise<{ items: InternalChatConversation[]; total: number }> {
    const items = this.conversations.filter((c) => this.participants.some((p) => p.conversationId === c.id && p.userId === filter.userId))
    return { items, total: items.length }
  }

  async getParticipants(conversationId: string): Promise<InternalChatParticipant[]> {
    return this.participants.filter((p) => p.conversationId === conversationId)
  }

  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    return this.participants.some((p) => p.conversationId === conversationId && p.userId === userId)
  }

  async addParticipant(conversationId: string, participant: { userId: string; organizationId: string; roleInChat?: string | undefined }): Promise<void> {
    if (await this.isParticipant(conversationId, participant.userId)) return
    this.participants.push({
      id: this.nextId("part"),
      conversationId,
      userId: participant.userId,
      organizationId: participant.organizationId,
      roleInChat: (participant.roleInChat as InternalChatParticipant["roleInChat"] | undefined) ?? "MEMBER",
      lastReadAt: new Date(),
      isMuted: false,
      joinedAt: new Date(),
    })
  }

  async sendMessage(params: SendMessageParams): Promise<InternalChatMessage> {
    const msg: InternalChatMessage = {
      id: this.nextId("msg"),
      conversationId: params.conversationId,
      senderUserId: params.senderUserId,
      senderRole: params.senderRole,
      messageType: (params.messageType as InternalChatMessage["messageType"] | undefined) ?? "TEXT",
      content: params.content,
      attachments: params.attachments ?? [],
      actionPayload: params.actionPayload ?? {},
      isDeleted: false,
      createdAt: new Date(),
    }
    this.messages.push(msg)
    return msg
  }

  async findMessageById(messageId: string): Promise<InternalChatMessage | null> {
    return this.messages.find((m) => m.id === messageId) ?? null
  }

  async listMessages(conversationId: string, limit = 50, before?: MessageCursor | undefined): Promise<MessagePage> {
    const all = this.messages.filter((m) => m.conversationId === conversationId)
    const end = before ? all.findIndex((m) => m.id === before.id) : all.length
    const start = Math.max(0, end - limit)
    const items = all.slice(start, end)
    const oldest = items[0]
    return { items, nextCursor: start > 0 && oldest ? { createdAt: oldest.createdAt, id: oldest.id } : null }
  }

  async markRead(conversationId: string, userId: string): Promise<void> {
    this.readMarks.push({ conversationId, userId })
  }

  async updateCardIfStatus(messageId: string, expectedStatus: string, patch: Record<string, unknown>): Promise<InternalChatMessage | null> {
    const msg = this.messages.find((m) => m.id === messageId)
    const payload = msg?.actionPayload as Record<string, unknown> | undefined
    if (!msg || payload?.status !== expectedStatus) return null
    msg.actionPayload = { ...payload, ...patch }
    return msg
  }
}

/** Chính sách liên kết giả: mặc định mọi cặp tổ chức đều liên kết ACTIVE; `active = false` mô phỏng chấm dứt. */
export class FakeLinkPolicy implements IChatLinkPolicy {
  active = true
  async hasActiveLink(a: string, b: string): Promise<boolean> {
    return a === b || this.active
  }
}
