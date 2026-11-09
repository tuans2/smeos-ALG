import { describe, expect, it, vi } from "vitest"
import type { InternalChatConversation } from "../domain/chat-entities"
import { ChatNotifyThrottle } from "../domain/chat-notify-throttle"
import { OrganizationChatNotifier } from "./chat-notifier"

const room = (id: string, counterpartOrgId: string | null = "partner-org") =>
  ({ id, organizationId: "chain-org", counterpartOrgId, conversationType: "CHAIN_PARTNER" }) as InternalChatConversation

describe("thông báo trao đổi nội bộ", () => {
  it("gộp: một thông báo mỗi phòng mỗi tổ chức trong 5 phút", () => {
    const t = new ChatNotifyThrottle(5 * 60_000)
    expect(t.take("r:o", 0)).toBe(true)
    expect(t.take("r:o", 4 * 60_000)).toBe(false)
    expect(t.take("r:o2", 4 * 60_000)).toBe(true)
    expect(t.take("r:o", 5 * 60_000)).toBe(true)
  })

  it("tin của chuỗi báo cửa hàng (link mở phòng với chuỗi); tin của cửa hàng báo chuỗi (link mở đúng phòng)", async () => {
    const notify = vi.fn().mockResolvedValue(1)
    const n = new OrganizationChatNotifier(notify)
    await n.messageReceived({ conversation: room("r1"), senderOrgId: "chain-org", preview: "Chào tiệm" })
    await n.messageReceived({ conversation: room("r2"), senderOrgId: "partner-org", preview: "Đã nhận" })
    expect(notify.mock.calls.map(([i]) => [i.organizationId, i.eventKey, i.deepLink])).toEqual([
      ["partner-org", "INTERNAL_CHAT_MESSAGE", "/tin-nhan?chuoi=chain-org"],
      ["chain-org", "INTERNAL_CHAT_MESSAGE", "/tin-nhan?phong=r2"],
    ])
  })

  it("phòng trong một tổ chức không báo; tin dài cắt gọn", async () => {
    const notify = vi.fn().mockResolvedValue(1)
    const n = new OrganizationChatNotifier(notify)
    await n.messageReceived({ conversation: room("r3", null), senderOrgId: "chain-org", preview: "x" })
    expect(notify).not.toHaveBeenCalled()
    await n.messageReceived({ conversation: room("r4"), senderOrgId: "chain-org", preview: "a".repeat(300) })
    expect(notify.mock.calls[0]![0].message.length).toBeLessThanOrEqual(121)
  })

  it("thẻ mời đơn báo cửa hàng được mời, kèm mã đơn", async () => {
    const notify = vi.fn().mockResolvedValue(1)
    await new OrganizationChatNotifier(notify).orderInvite({ chainOrgId: "chain-org", partnerOrgId: "partner-org", orderCode: "DH-1" })
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "partner-org", eventKey: "INTERNAL_CHAT_ORDER_INVITE", deepLink: "/tin-nhan?chuoi=chain-org" }))
    expect(notify.mock.calls[0]![0].title).toContain("DH-1")
  })
})
