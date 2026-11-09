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
import type { LinkState } from "../../domain/conversation-access-policy"

/** Repository chat trong bộ nhớ cho unit test use-case — mô phỏng đúng các hợp đồng của port. */
export class InMemoryChatRepository implements IInternalChatRepository {
  conversations: InternalChatConversation[] = []
  participants: InternalChatParticipant[] = []
  messages: InternalChatMessage[] = []
  readMarks: { conversationId: string; userId: string; organizationId: string }[] = []
  roomKeys = new Map<string, string>()
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
      counterpartOrgId: params.counterpartOrgId ?? null,
      branchId: params.branchId ?? null,
      createdBy: params.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMessageAt: new Date(),
    }
    if (params.roomKey && this.conversations.some((c) => c.organizationId === params.organizationId && this.roomKeys.get(c.id) === params.roomKey)) {
      throw new Error("Unique constraint failed on room_key")
    }
    this.conversations.push(conv)
    if (params.roomKey) this.roomKeys.set(conv.id, params.roomKey)
    for (const p of params.participantUserIds) await this.addParticipant(conv.id, p)
    return conv
  }

  async findConversationById(id: string): Promise<InternalChatConversation | null> {
    return this.conversations.find((c) => c.id === id) ?? null
  }

  async findConversationByOrderId(organizationId: string, orderId: string): Promise<InternalChatConversation | null> {
    return this.conversations.find((c) => c.organizationId === organizationId && c.orderId === orderId) ?? null
  }

  async findConversationByRoomKey(organizationId: string, roomKey: string): Promise<InternalChatConversation | null> {
    return this.conversations.find((c) => c.organizationId === organizationId && this.roomKeys.get(c.id) === roomKey) ?? null
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

  async setMuted(conversationId: string, userId: string, organizationId: string, muted: boolean): Promise<void> {
    await this.addParticipant(conversationId, { userId, organizationId })
    const p = this.participants.find((x) => x.conversationId === conversationId && x.userId === userId)!
    p.isMuted = muted
  }

  async mutedUserIds(conversationId: string): Promise<string[]> {
    return this.participants.filter((p) => p.conversationId === conversationId && p.isMuted).map((p) => p.userId)
  }

  async markRead(conversationId: string, userId: string, organizationId: string): Promise<void> {
    this.readMarks.push({ conversationId, userId, organizationId })
  }

  purged: { ownerOrgId: string; keys: string[] }[] = []

  async editMessage(messageId: string, content: string, editedAt: Date): Promise<InternalChatMessage | null> {
    const msg = this.messages.find((m) => m.id === messageId)
    if (!msg || msg.isDeleted) return null
    msg.content = content
    msg.editedAt = editedAt.toISOString()
    return msg
  }

  async deleteMessage(messageId: string, _deletedAt: Date, purge: { ownerOrgId: string; keys: string[] }): Promise<boolean> {
    const msg = this.messages.find((m) => m.id === messageId)
    if (!msg || msg.isDeleted) return false
    msg.isDeleted = true
    msg.content = ""
    msg.attachments = []
    this.purged.push(purge)
    return true
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
  /** Trạng thái liên kết chuỗi → cửa hàng; mặc định theo `active` */
  state: LinkState | null = null
  async hasActiveLink(a: string, b: string): Promise<boolean> {
    return a === b || (this.state ?? (this.active ? "ACTIVE" : "OTHER")) === "ACTIVE"
  }
  async linkState(): Promise<LinkState> {
    return this.state ?? (this.active ? "ACTIVE" : "OTHER")
  }
}
