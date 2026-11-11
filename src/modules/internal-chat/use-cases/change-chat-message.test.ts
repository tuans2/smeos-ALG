import { beforeEach, describe, expect, it } from "vitest"
import { MESSAGE_CHANGE_WINDOW_MS } from "../domain/message-change-policy"
import { ChatAccessDeniedError, InvalidMessageContentError, MessageChangeNotAllowedError } from "../domain/errors"
import { changeableDecorator, deleteChatMessage, editChatMessage } from "./change-chat-message"
import { ensurePartnerConversation } from "./ensure-room"
import { FakeLinkPolicy, InMemoryChatRepository } from "./__tests__/in-memory-chat-repo"

const STORE = { userId: "store-user", organizationId: "store", branchId: null }
const CHAIN = { userId: "chain-user", organizationId: "chain", branchId: null }

describe("sửa / thu hồi tin nhắn", () => {
  let repo: InMemoryChatRepository
  let links: FakeLinkPolicy
  let roomId: string
  let now: Date
  const deps = () => ({ chatRepo: repo, linkPolicy: links, now: () => now })
  const say = (who: typeof STORE, content: string, extra: Record<string, unknown> = {}) =>
    repo.sendMessage({ conversationId: roomId, senderUserId: who.userId, senderRole: "x", messageType: "TEXT", content, ...extra })

  beforeEach(async () => {
    repo = new InMemoryChatRepository()
    links = new FakeLinkPolicy()
    roomId = (await ensurePartnerConversation(repo, { chainOrgId: "chain", partnerOrgId: "store", title: "x", createdBy: "u" })).id
    now = new Date()
  })

  it("người gửi sửa tin của mình trong 24 giờ; đánh dấu đã sửa", async () => {
    const msg = await say(STORE, "Giao 3 giờ chiều")
    const edited = await editChatMessage(deps(), { messageId: msg.id, caller: STORE, content: " Giao 4 giờ chiều " })
    expect(edited).toMatchObject({ content: "Giao 4 giờ chiều" })
    expect(edited.editedAt).toBeTruthy()
  })

  it("tin của người khác → 404; quá 24 giờ, thẻ đơn, tin hệ thống, đã thu hồi → 409; tin chữ rỗng → 400", async () => {
    const mine = await say(STORE, "a")
    await expect(editChatMessage(deps(), { messageId: mine.id, caller: CHAIN, content: "b" })).rejects.toThrow(ChatAccessDeniedError)
    await expect(editChatMessage(deps(), { messageId: mine.id, caller: STORE, content: "  " })).rejects.toThrow(InvalidMessageContentError)

    const card = await say(STORE, "thẻ", { messageType: "ACTION_CARD_SUBCONTRACT", actionPayload: { orderCode: "DH" } })
    await expect(deleteChatMessage(deps(), { messageId: card.id, caller: STORE })).rejects.toThrow(MessageChangeNotAllowedError)
    const notice = await say(STORE, "tin hệ thống", { messageType: "SYSTEM_NOTICE" })
    await expect(editChatMessage(deps(), { messageId: notice.id, caller: STORE, content: "x" })).rejects.toThrow(MessageChangeNotAllowedError)

    now = new Date(Date.now() + MESSAGE_CHANGE_WINDOW_MS + 1000)
    await expect(editChatMessage(deps(), { messageId: mine.id, caller: STORE, content: "b" })).rejects.toThrow(MessageChangeNotAllowedError)
  })

  it("thu hồi: xoá nội dung, ảnh đúng thư mục phòng vào hàng đợi xoá của chủ phòng; thu hồi lần hai → 409", async () => {
    const img = await say(STORE, "mẫu", { messageType: "IMAGE", attachments: [`org/chain/chat-${roomId}/a.jpg`, "org/khac/unfiled/b.jpg"] })
    expect(await deleteChatMessage(deps(), { messageId: img.id, caller: STORE })).toEqual({ messageType: "IMAGE", imageCount: 1 })
    expect(repo.purged).toEqual([{ ownerOrgId: "chain", keys: [`org/chain/chat-${roomId}/a.jpg`] }])
    expect(repo.messages.find((m) => m.id === img.id)).toMatchObject({ isDeleted: true, content: "", attachments: [] })
    await expect(deleteChatMessage(deps(), { messageId: img.id, caller: STORE })).rejects.toThrow(MessageChangeNotAllowedError)
  })

  it("liên kết tạm dừng: không sửa / thu hồi được (404)", async () => {
    const msg = await say(STORE, "a")
    links.state = "SUSPENDED"
    await expect(deleteChatMessage(deps(), { messageId: msg.id, caller: STORE })).rejects.toThrow(ChatAccessDeniedError)
  })

  it("đánh dấu canChange chỉ cho tin của người xem còn trong hạn", async () => {
    const mine = await say(STORE, "a")
    const theirs = await say(CHAIN, "b")
    const conv = (await repo.findConversationById(roomId))!
    const out = await changeableDecorator(() => now)([mine, theirs], conv, STORE)
    expect(out.map((m) => Boolean(m.canChange))).toEqual([true, false])
  })
})
