import { beforeEach, describe, expect, it } from "vitest"
import { ChatAccessDeniedError } from "../domain/errors"
import { ensurePartnerConversation } from "./ensure-room"
import { GetConversationMessagesUseCase } from "./get-conversation-messages"
import { openRoom, type IChatRoomDirectory } from "./open-room"
import { SendChatMessageUseCase } from "./send-chat-message"
import { FakeLinkPolicy, InMemoryChatRepository } from "./__tests__/in-memory-chat-repo"

const CHAIN = { userId: "chain-user", organizationId: "chain-org", branchId: null }
const PARTNER = { userId: "partner-user", organizationId: "partner-org", branchId: null }
const NEW_PARTNER_STAFF = { userId: "partner-new", organizationId: "partner-org", branchId: null }

const directory: IChatRoomDirectory = {
  organizationName: async (id) => (id === "partner-org" ? "Tiệm hoa Đối Tác" : null),
  branchName: async (org, id) => (org === "chain-org" && id === "branch-1" ? "Chi nhánh 1" : null),
}

describe("phòng trao đổi theo đối tác (GĐ2)", () => {
  let repo: InMemoryChatRepository
  let links: FakeLinkPolicy
  const deps = () => ({ chatRepo: repo, linkPolicy: links, directory })

  beforeEach(() => {
    repo = new InMemoryChatRepository()
    links = new FakeLinkPolicy()
  })

  it("một liên kết một phòng: gọi lại, mở từ hai phía đều ra cùng phòng", async () => {
    const a = await ensurePartnerConversation(repo, { chainOrgId: "chain-org", partnerOrgId: "partner-org", title: "x", createdBy: "u" })
    const b = await ensurePartnerConversation(repo, { chainOrgId: "chain-org", partnerOrgId: "partner-org", title: "y", createdBy: "u" })
    const fromChain = await openRoom(deps(), CHAIN, { partnerOrgId: "partner-org" })
    const fromStore = await openRoom(deps(), PARTNER, { chainOrgId: "chain-org" })
    expect(new Set([a.id, b.id, fromChain.id, fromStore.id]).size).toBe(1)
    expect(repo.conversations).toHaveLength(1)
    expect(a.counterpartOrgId).toBe("partner-org")
  })

  it("nhân viên mới của cửa hàng vào được ngay, không cần được mời", async () => {
    const room = await openRoom(deps(), CHAIN, { partnerOrgId: "partner-org" })
    await new SendChatMessageUseCase(repo, links).execute({ conversationId: room.id, ...CHAIN, userRole: "dieu_phoi", content: "Chào tiệm" })
    const page = await new GetConversationMessagesUseCase(repo, links).execute({ conversationId: room.id, ...NEW_PARTNER_STAFF })
    expect(page.items.map((m) => m.content)).toEqual(["Chào tiệm"])
    expect(repo.readMarks.at(-1)).toEqual({ conversationId: room.id, userId: "partner-new", organizationId: "partner-org" })
  })

  it("liên kết tạm dừng: cửa hàng chỉ đọc; chấm dứt: không đọc", async () => {
    const room = await openRoom(deps(), CHAIN, { partnerOrgId: "partner-org" })
    links.state = "SUSPENDED"
    await expect(new GetConversationMessagesUseCase(repo, links).execute({ conversationId: room.id, ...PARTNER })).resolves.toBeTruthy()
    await expect(new SendChatMessageUseCase(repo, links).execute({ conversationId: room.id, ...PARTNER, userRole: "x", content: "a" })).rejects.toThrow(ChatAccessDeniedError)
    links.state = "OTHER"
    await expect(new GetConversationMessagesUseCase(repo, links).execute({ conversationId: room.id, ...PARTNER })).rejects.toThrow(ChatAccessDeniedError)
  })

  it("không mở được phòng khi không có liên kết, với chính mình, hoặc nhân viên chi nhánh mở thay cả chuỗi", async () => {
    links.state = "OTHER"
    await expect(openRoom(deps(), CHAIN, { partnerOrgId: "partner-org" })).rejects.toThrow(ChatAccessDeniedError)
    links.state = "ACTIVE"
    await expect(openRoom(deps(), CHAIN, { partnerOrgId: "chain-org" })).rejects.toThrow(ChatAccessDeniedError)
    await expect(openRoom(deps(), { ...CHAIN, branchId: "branch-1" }, { partnerOrgId: "partner-org" })).rejects.toThrow(ChatAccessDeniedError)
  })

  it("phòng chi nhánh: chi nhánh của tổ chức mình; nhân viên chi nhánh khác không mở, không đọc", async () => {
    const room = await openRoom(deps(), CHAIN, { branchId: "branch-1" })
    expect(room.conversationType).toBe("CHAIN_BRANCH")
    await expect(openRoom(deps(), { ...CHAIN, branchId: "branch-2" }, { branchId: "branch-1" })).rejects.toThrow(ChatAccessDeniedError)
    await expect(openRoom(deps(), CHAIN, { branchId: "branch-of-other-org" })).rejects.toThrow(ChatAccessDeniedError)
    await expect(new GetConversationMessagesUseCase(repo, links).execute({ conversationId: room.id, ...CHAIN, branchId: "branch-2" })).rejects.toThrow(ChatAccessDeniedError)
    await expect(new GetConversationMessagesUseCase(repo, links).execute({ conversationId: room.id, ...CHAIN, branchId: "branch-1" })).resolves.toBeTruthy()
  })
})
