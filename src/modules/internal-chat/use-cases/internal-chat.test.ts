import { describe, it, expect, beforeEach } from "vitest"
import type { IInternalChatRepository, CreateConversationParams, ListConversationsFilter, SendMessageParams } from "../domain/chat-repository.interface"
import type { InternalChatConversation, InternalChatMessage, InternalChatParticipant } from "../domain/chat-entities"
import { SendChatMessageUseCase } from "./send-chat-message"
import { CreateOrGetConversationUseCase } from "./create-or-get-conversation"
import { HandleCardActionUseCase } from "./handle-card-action"
import { ChatAccessDeniedError, ConversationNotFoundError, InvalidMessageContentError } from "../domain/errors"

class InMemoryChatRepository implements IInternalChatRepository {
  public conversations: InternalChatConversation[] = []
  public participants: InternalChatParticipant[] = []
  public messages: InternalChatMessage[] = []

  async createConversation(params: CreateConversationParams): Promise<InternalChatConversation> {
    const conv: InternalChatConversation = {
      id: "conv-1",
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

    params.participantUserIds.forEach((p, idx) => {
      this.participants.push({
        id: `part-${idx}`,
        conversationId: conv.id,
        userId: p.userId,
        organizationId: p.organizationId,
        roleInChat: (p.roleInChat as InternalChatParticipant["roleInChat"] | undefined) ?? "MEMBER",
        lastReadAt: new Date(),
        isMuted: false,
        joinedAt: new Date(),
      })
    })

    return conv
  }

  async findConversationById(id: string): Promise<InternalChatConversation | null> {
    return this.conversations.find((c) => c.id === id) ?? null
  }

  async findConversationByOrderId(orderId: string): Promise<InternalChatConversation | null> {
    return this.conversations.find((c) => c.orderId === orderId) ?? null
  }

  async listConversations(filter: ListConversationsFilter): Promise<{ items: InternalChatConversation[]; total: number }> {
    return { items: this.conversations, total: this.conversations.length }
  }

  async getParticipants(conversationId: string): Promise<InternalChatParticipant[]> {
    return this.participants.filter((p) => p.conversationId === conversationId)
  }

  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    return this.participants.some((p) => p.conversationId === conversationId && p.userId === userId)
  }

  async addParticipant(conversationId: string, participant: { userId: string; organizationId: string; roleInChat?: string }): Promise<void> {
    this.participants.push({
      id: `part-${Date.now()}`,
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
      id: `msg-${Date.now()}`,
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

  async listMessages(conversationId: string): Promise<InternalChatMessage[]> {
    return this.messages.filter((m) => m.conversationId === conversationId)
  }

  async markRead(): Promise<void> {}

  async updateActionPayload(messageId: string, newPayload: Record<string, unknown>): Promise<InternalChatMessage> {
    const msg = this.messages.find((m) => m.id === messageId)
    if (!msg) throw new Error("Not found")
    msg.actionPayload = newPayload
    return msg
  }
}

describe("Internal Chat Use Cases", () => {
  let repo: InMemoryChatRepository

  beforeEach(() => {
    repo = new InMemoryChatRepository()
  })

  it("tạo cuộc hội thoại thành công với các thành viên ban đầu", async () => {
    const useCase = new CreateOrGetConversationUseCase(repo)
    const conv = await useCase.execute({
      organizationId: "org-1",
      userId: "user-1",
      userRole: "coordinator",
      conversationType: "CHAIN_PARTNER",
      targetUserId: "partner-1",
      targetOrganizationId: "org-partner",
      title: "Trao đổi gia công Chi nhánh A",
    })

    expect(conv.id).toBe("conv-1")
    expect(repo.participants).toHaveLength(2)
  })

  it("gửi tin nhắn kiểm tra quyền thành viên và nội dung không rỗng", async () => {
    const createCase = new CreateOrGetConversationUseCase(repo)
    const conv = await createCase.execute({
      organizationId: "org-1",
      userId: "user-1",
      userRole: "coordinator",
      conversationType: "CHAIN_PARTNER",
    })

    const sendCase = new SendChatMessageUseCase(repo)

    // Người lạ không phải participant gửi tin → throw ChatAccessDeniedError
    await expect(
      sendCase.execute({
        conversationId: conv.id,
        userId: "stranger-99",
        userRole: "member",
        content: "Xin chào",
      })
    ).rejects.toThrow(ChatAccessDeniedError)

    // Gửi tin nhắn rỗng → throw InvalidMessageContentError
    await expect(
      sendCase.execute({
        conversationId: conv.id,
        userId: "user-1",
        userRole: "coordinator",
        content: "   ",
      })
    ).rejects.toThrow(InvalidMessageContentError)

    // Gửi tin nhắn hợp lệ
    const msg = await sendCase.execute({
      conversationId: conv.id,
      userId: "user-1",
      userRole: "coordinator",
      content: "Đơn hàng gấp cần làm ngay",
    })

    expect(msg.content).toBe("Đơn hàng gấp cần làm ngay")
    expect(repo.messages).toHaveLength(1)
  })

  it("xử lý nhận đơn trên Action Card cập nhật living state", async () => {
    const createCase = new CreateOrGetConversationUseCase(repo)
    const conv = await createCase.execute({
      organizationId: "org-1",
      userId: "user-1",
      userRole: "coordinator",
      conversationType: "ORDER_THREAD",
      orderId: "order-123",
    })

    const sendCase = new SendChatMessageUseCase(repo)
    const cardMsg = await sendCase.execute({
      conversationId: conv.id,
      userId: "user-1",
      userRole: "coordinator",
      content: "Điều phối đơn #ORD-01",
      messageType: "ACTION_CARD_ORDER",
      actionPayload: { orderId: "order-123", status: "PENDING_ACCEPT" },
    })

    // Đối tác được mời vào luồng đơn (như `dispatch-order-to-chat`) — chỉ người tham gia mới bấm được nút.
    await repo.addParticipant(conv.id, { userId: "partner-user-1", organizationId: "partner-org-1" })
    const handleActionCase = new HandleCardActionUseCase(repo)
    const updated = await handleActionCase.execute({
      messageId: cardMsg.id,
      userId: "partner-user-1",
      userOrgId: "partner-org-1",
      action: "ACCEPT_ORDER",
    })

    expect((updated.actionPayload as { status?: string }).status).toBe("ACCEPTED")
    // Giữ trạng thái sống của thẻ — trước 08/11/2026 cả `action_payload` bị ghi đè, mất mã đơn.
    expect((updated.actionPayload as { orderId?: string }).orderId).toBe("order-123")
    expect(repo.messages).toHaveLength(2) // 1 card msg + 1 system announcement
  })

  it("người không tham gia hội thoại hoặc mã tin lạ → 404, thẻ không đổi", async () => {
    const conv = await new CreateOrGetConversationUseCase(repo).execute({
      organizationId: "org-1", userId: "user-1", userRole: "coordinator", conversationType: "ORDER_THREAD", orderId: "order-9",
    })
    const card = await new SendChatMessageUseCase(repo).execute({
      conversationId: conv.id, userId: "user-1", userRole: "coordinator", content: "Đơn #9", messageType: "ACTION_CARD_ORDER",
      actionPayload: { orderId: "order-9", status: "PENDING_ACCEPT" },
    })
    const useCase = new HandleCardActionUseCase(repo)
    const outsider = useCase.execute({ messageId: card.id, userId: "user-org-khac", userOrgId: "org-khac", action: "REJECT_ORDER" })
    await expect(outsider).rejects.toThrow(ChatAccessDeniedError)
    await expect(outsider).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(useCase.execute({ messageId: "msg-khong-co", userId: "user-1", userOrgId: "org-1", action: "ACCEPT_ORDER" })).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(repo.messages.find((m) => m.id === card.id)?.actionPayload).toEqual({ orderId: "order-9", status: "PENDING_ACCEPT" })
    expect(repo.messages).toHaveLength(1)
  })

  it("tin không phải thẻ đơn → 409", async () => {
    const conv = await new CreateOrGetConversationUseCase(repo).execute({
      organizationId: "org-1", userId: "user-1", userRole: "coordinator", conversationType: "ORDER_THREAD", orderId: "order-10",
    })
    const text = await new SendChatMessageUseCase(repo).execute({ conversationId: conv.id, userId: "user-1", userRole: "coordinator", content: "Chào đối tác" })
    await expect(new HandleCardActionUseCase(repo).execute({ messageId: text.id, userId: "user-1", userOrgId: "org-1", action: "ACCEPT_ORDER" }))
      .rejects.toMatchObject({ code: "CONFLICT" })
  })
})
