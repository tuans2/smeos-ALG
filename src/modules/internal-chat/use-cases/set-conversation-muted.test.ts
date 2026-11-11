import { describe, expect, it } from "vitest"
import { ChatAccessDeniedError } from "../domain/errors"
import { ensurePartnerConversation } from "./ensure-room"
import { setConversationMuted } from "./set-conversation-muted"
import { FakeLinkPolicy, InMemoryChatRepository } from "./__tests__/in-memory-chat-repo"

describe("tắt tiếng phòng trao đổi", () => {
  it("người vào được phòng (kể cả chỉ đọc) tắt / bật tiếng cho chính mình; người ngoài → 404", async () => {
    const repo = new InMemoryChatRepository()
    const links = new FakeLinkPolicy()
    const room = await ensurePartnerConversation(repo, { chainOrgId: "chain", partnerOrgId: "store", title: "x", createdBy: "u" })
    const store = { userId: "s1", organizationId: "store", branchId: null }

    links.state = "SUSPENDED"
    await setConversationMuted({ chatRepo: repo, linkPolicy: links }, { conversationId: room.id, caller: store, muted: true })
    expect(await repo.mutedUserIds(room.id)).toEqual(["s1"])
    await setConversationMuted({ chatRepo: repo, linkPolicy: links }, { conversationId: room.id, caller: store, muted: false })
    expect(await repo.mutedUserIds(room.id)).toEqual([])

    await expect(
      setConversationMuted({ chatRepo: repo, linkPolicy: links }, { conversationId: room.id, caller: { userId: "x", organizationId: "third", branchId: null }, muted: true })
    ).rejects.toThrow(ChatAccessDeniedError)
  })
})
