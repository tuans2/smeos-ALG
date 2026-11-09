import { describe, it, expect, beforeEach } from "vitest"
import type { InternalChatConversation, InternalChatMessage } from "../domain/chat-entities"
import { CHAT_MESSAGE_MAX_LENGTH } from "../domain/chat-limits"
import { CardActionConflictError, ChatAccessDeniedError, ConversationNotFoundError, InvalidMessageContentError } from "../domain/errors"
import { SendChatMessageUseCase } from "./send-chat-message"
import { CreateOrGetConversationUseCase } from "./create-or-get-conversation"
import { HandleCardActionUseCase } from "./handle-card-action"
import { GetConversationMessagesUseCase } from "./get-conversation-messages"
import { FakeLinkPolicy, InMemoryChatRepository } from "./__tests__/in-memory-chat-repo"

const CHAIN = { userId: "chain-user", organizationId: "chain-org" }
const PARTNER = { userId: "partner-user", organizationId: "partner-org" }
const STRANGER = { userId: "stranger-user", organizationId: "stranger-org" }

describe("Internal Chat Use Cases", () => {
  let repo: InMemoryChatRepository
  let links: FakeLinkPolicy

  beforeEach(() => {
    repo = new InMemoryChatRepository()
    links = new FakeLinkPolicy()
  })

  async function partnerRoom(): Promise<InternalChatConversation> {
    return repo.createConversation({
      organizationId: CHAIN.organizationId,
      conversationType: "ORDER_THREAD",
      orderId: "order-123",
      createdBy: CHAIN.userId,
      participantUserIds: [
        { userId: CHAIN.userId, organizationId: CHAIN.organizationId, roleInChat: "OWNER" },
        { userId: PARTNER.userId, organizationId: PARTNER.organizationId },
      ],
    })
  }

  /** Thẻ đơn do máy chủ sinh (như DispatchOrderToChatUseCase) — client không gửi được thẻ. */
  async function orderCard(conv: InternalChatConversation): Promise<InternalChatMessage> {
    return repo.sendMessage({
      conversationId: conv.id,
      senderUserId: CHAIN.userId,
      senderRole: "dieu_phoi",
      messageType: "ACTION_CARD_ORDER",
      content: "Điều phối đơn #ORD-01",
      actionPayload: { orderId: "order-123", orderCode: "ORD-01", priceVnd: 500000, status: "PENDING_ACCEPT", assignedPartnerOrgId: PARTNER.organizationId },
    })
  }

  const send = () => new SendChatMessageUseCase(repo, links)
  const act = () => new HandleCardActionUseCase(repo, links)
  const accept = (messageId: string, who = PARTNER) =>
    act().execute({ messageId, userId: who.userId, userOrgId: who.organizationId, userRole: "cua_hang", action: "ACCEPT_ORDER" })

  it("tạo cuộc hội thoại thành công với các thành viên ban đầu", async () => {
    const conv = await new CreateOrGetConversationUseCase(repo, links).execute({
      ...CHAIN,
      userRole: "dieu_hanh",
      conversationType: "CHAIN_PARTNER",
      targetUserId: PARTNER.userId,
      targetOrganizationId: PARTNER.organizationId,
    })
    expect(conv.conversationType).toBe("CHAIN_PARTNER")
    expect(repo.participants.filter((p) => p.conversationId === conv.id)).toHaveLength(2)
  })

  it("tạo lại phòng 1-1 với cùng người thì dùng lại phòng cũ, không sinh phòng trùng", async () => {
    const useCase = new CreateOrGetConversationUseCase(repo, links)
    const input = { ...CHAIN, userRole: "dieu_hanh", conversationType: "CHAIN_PARTNER" as const, targetUserId: PARTNER.userId, targetOrganizationId: PARTNER.organizationId }
    const first = await useCase.execute(input)
    const second = await useCase.execute(input)
    expect(second.id).toBe(first.id)
    expect(repo.conversations).toHaveLength(1)
  })

  it("gửi tin kiểm thành viên, nội dung không rỗng, độ dài, và luôn là tin chữ", async () => {
    const conv = await partnerRoom()
    await expect(send().execute({ conversationId: "khong-co", ...CHAIN, userRole: "x", content: "a" })).rejects.toThrow(ConversationNotFoundError)
    await expect(send().execute({ conversationId: conv.id, ...STRANGER, userRole: "x", content: "a" })).rejects.toThrow(ChatAccessDeniedError)
    await expect(send().execute({ conversationId: conv.id, ...CHAIN, userRole: "x", content: "   " })).rejects.toThrow(InvalidMessageContentError)
    await expect(send().execute({ conversationId: conv.id, ...CHAIN, userRole: "x", content: "a".repeat(CHAT_MESSAGE_MAX_LENGTH + 1) })).rejects.toThrow(InvalidMessageContentError)

    const msg = await send().execute({ conversationId: conv.id, ...PARTNER, userRole: "cua_hang", content: " Đơn gấp cần làm ngay " })
    expect(msg.content).toBe("Đơn gấp cần làm ngay")
    expect(msg.messageType).toBe("TEXT")
  })

  it("đối tác có liên kết không còn ACTIVE: không đọc, không gửi, không bấm thẻ", async () => {
    const conv = await partnerRoom()
    const card = await orderCard(conv)
    links.active = false
    await expect(send().execute({ conversationId: conv.id, ...PARTNER, userRole: "x", content: "chào" })).rejects.toThrow(ChatAccessDeniedError)
    await expect(new GetConversationMessagesUseCase(repo, links).execute({ conversationId: conv.id, ...PARTNER })).rejects.toThrow(ChatAccessDeniedError)
    await expect(accept(card.id)).rejects.toThrow(ChatAccessDeniedError)
    // Chuỗi vẫn xem được lịch sử phòng của mình
    const page = await new GetConversationMessagesUseCase(repo, links).execute({ conversationId: conv.id, ...CHAIN })
    expect(page.items).toHaveLength(1)
  })

  it("nhận đơn: gộp trạng thái vào thẻ, giữ nguyên mã đơn / giá, đăng tin hệ thống theo vai thật", async () => {
    const card = await orderCard(await partnerRoom())
    const updated = await accept(card.id)
    const payload = updated.actionPayload as Record<string, unknown>
    expect(payload.status).toBe("ACCEPTED")
    expect(payload.orderCode).toBe("ORD-01")
    expect(payload.priceVnd).toBe(500000)
    expect(payload.assignedPartnerOrgId).toBe(PARTNER.organizationId)
    expect(payload.actionByUserId).toBe(PARTNER.userId)
    const notice = repo.messages.find((m) => m.messageType === "SYSTEM_NOTICE")
    expect(notice?.senderRole).toBe("cua_hang")
  })

  it("thẻ đã xử lý → 409; người bấm sau trong lúc đua cũng → 409", async () => {
    const card = await orderCard(await partnerRoom())
    await accept(card.id)
    await expect(accept(card.id)).rejects.toThrow(CardActionConflictError)

    const card2 = await orderCard(repo.conversations[0]!)
    repo.updateCardIfStatus = async () => null // người khác vừa bấm trước
    await expect(accept(card2.id)).rejects.toThrow(CardActionConflictError)
  })

  it("không phải tổ chức được giao, người gửi thẻ, người ngoài, tin không phải thẻ → 404 và thẻ không đổi", async () => {
    const conv = await partnerRoom()
    const card = await orderCard(conv)
    await expect(accept(card.id, STRANGER)).rejects.toThrow(ChatAccessDeniedError)
    await expect(accept(card.id, CHAIN)).rejects.toThrow(ChatAccessDeniedError)
    await expect(accept("khong-co")).rejects.toThrow(ChatAccessDeniedError)

    await repo.addParticipant(conv.id, STRANGER) // vào được phòng nhưng không phải tổ chức được giao
    await expect(accept(card.id, STRANGER)).rejects.toThrow(ChatAccessDeniedError)

    const text = await send().execute({ conversationId: conv.id, ...CHAIN, userRole: "x", content: "chào" })
    await expect(accept(text.id)).rejects.toThrow(ChatAccessDeniedError)

    expect((card.actionPayload as Record<string, unknown>).status).toBe("PENDING_ACCEPT")
    expect(repo.messages.some((m) => m.messageType === "SYSTEM_NOTICE")).toBe(false)
  })

  it("đọc tin: trang mới nhất mới đánh dấu đã đọc; trang cũ hơn thì không", async () => {
    const conv = await partnerRoom()
    for (let i = 0; i < 5; i++) await send().execute({ conversationId: conv.id, ...CHAIN, userRole: "x", content: `tin ${i}` })
    const get = new GetConversationMessagesUseCase(repo, links)
    const latest = await get.execute({ conversationId: conv.id, ...PARTNER, limit: 2 })
    expect(latest.items.map((m) => m.content)).toEqual(["tin 3", "tin 4"])
    expect(repo.readMarks).toHaveLength(1)

    const older = await get.execute({ conversationId: conv.id, ...PARTNER, limit: 2, before: latest.nextCursor! })
    expect(older.items.map((m) => m.content)).toEqual(["tin 1", "tin 2"])
    expect(repo.readMarks).toHaveLength(1)
  })
})
