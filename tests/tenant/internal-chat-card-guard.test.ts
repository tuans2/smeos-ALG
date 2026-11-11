import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as listConversations, POST as createConversation } from "@/app/api/v1/internal-chat/conversations/route"
import { GET as listMessages, POST as sendMessage } from "@/app/api/v1/internal-chat/conversations/[id]/messages/route"
import { POST as cardAction } from "@/app/api/v1/internal-chat/messages/[id]/action/route"
import { POST as dispatchToChat } from "@/app/api/v1/coordinator/orders/[id]/dispatch-to-chat/route"
import { POST as createOrder } from "@/app/api/v1/orders/route"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, linkPartner, makeChainOrganization, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Chat nội bộ — GĐ1 kế hoạch `docs/plan/hoan-thien-chat-noi-bo.md`: bấm thẻ đơn chỉ dành cho tổ chức được giao,
 * client không giả được thẻ / tin hệ thống, đối tác hết liên kết mất quyền, không gắn đơn của tổ chức khác vào phòng,
 * đọc đúng trang tin mới nhất và đếm chưa đọc thật.
 */
describe("cách ly tenant — thẻ đơn và tin nhắn chat nội bộ", () => {
  let chain: Tenant
  let partner: Tenant
  let stranger: Tenant
  const BASE = "http://localhost/api/v1"
  const params = (id: string) => ({ params: Promise.resolve({ id }) })
  const post = (url: string, token: string, body: unknown) => withSession(url, token, { method: "POST", body: JSON.stringify(body) })

  beforeEach(async () => {
    await resetDatabase()
    chain = await createTenant("chuoi")
    partner = await createTenant("doitac")
    stranger = await createTenant("nguoila")
    await makeChainOrganization(chain)
    await linkPartner(chain, partner, { code: "P-01" })
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function orderOf(t: Tenant): Promise<string> {
    const res = await createOrder(post(`${BASE}/orders`, t.token, { items: [{ description: "Bó hoa", quantity: 1, unitPriceVnd: 300000 }] }))
    return ((await readJson(res)) as { order: { id: string } }).order.id
  }

  /** Chuỗi gửi đơn vào chat cho đúng người của đối tác → { phòng, thẻ }. */
  async function dispatchCard(): Promise<{ conversationId: string; messageId: string; orderId: string }> {
    const orderId = await orderOf(chain)
    const res = await dispatchToChat(post(`${BASE}/coordinator/orders/${orderId}/dispatch-to-chat`, chain.token, { targetPartnerOrgId: partner.organizationId, targetPartnerUserId: partner.userId }), params(orderId))
    expect(res.status).toBe(200)
    const data = ((await readJson(res)) as { data: { conversationId: string; message: { id: string } } }).data
    return { conversationId: data.conversationId, messageId: data.message.id, orderId }
  }

  const act = (t: Tenant, messageId: string, action = "ACCEPT_ORDER") =>
    cardAction(post(`${BASE}/internal-chat/messages/${messageId}/action`, t.token, { action }), params(messageId))

  async function cardStatus(messageId: string): Promise<unknown> {
    const row = await prisma.internal_chat_messages.findUniqueOrThrow({ where: { id: messageId } })
    return (row.action_payload as Record<string, unknown>).status
  }

  it("tổ chức thứ ba và chính bên giao đơn không bấm được thẻ; đối tác được giao nhận một lần, lần sau 409", async () => {
    const { messageId } = await dispatchCard()
    expect((await act(stranger, messageId)).status).toBe(404)
    expect((await act(chain, messageId)).status).toBe(404)
    expect(await cardStatus(messageId)).toBe("PENDING_ACCEPT")

    expect((await act(partner, messageId)).status).toBe(200)
    const row = await prisma.internal_chat_messages.findUniqueOrThrow({ where: { id: messageId } })
    const payload = row.action_payload as Record<string, unknown>
    expect(payload.status).toBe("ACCEPTED")
    expect(payload.orderCode).toBeTruthy()
    expect(payload.priceVnd).toBe(300000)

    expect((await act(partner, messageId, "REJECT_ORDER")).status).toBe(409)
    expect(await cardStatus(messageId)).toBe("ACCEPTED")
  })

  it("client không tự gửi được tin hệ thống, thẻ hay đính kèm; không tạo phòng PLATFORM_TENANT", async () => {
    const { conversationId } = await dispatchCard()
    const url = `${BASE}/internal-chat/conversations/${conversationId}/messages`
    expect((await sendMessage(post(url, partner.token, { content: "Đã nhận", messageType: "SYSTEM_NOTICE" }), params(conversationId))).status).toBe(400)
    expect((await sendMessage(post(url, partner.token, { content: "x", actionPayload: { status: "ACCEPTED" } }), params(conversationId))).status).toBe(400)
    expect((await sendMessage(post(url, partner.token, { content: "x", attachments: ["https://la.example/anh.png"] }), params(conversationId))).status).toBe(400)
    expect((await sendMessage(post(url, partner.token, { content: "Chào chuỗi" }), params(conversationId))).status).toBe(200)

    const platform = await createConversation(post(`${BASE}/internal-chat/conversations`, chain.token, { conversationType: "PLATFORM_TENANT" }))
    expect(platform.status).toBe(400)
  })

  it("đối tác bị chấm dứt liên kết: không đọc, không gửi, không thấy phòng trong danh sách", async () => {
    const { conversationId } = await dispatchCard()
    await prisma.organization_links.updateMany({ where: { parent_org_id: chain.organizationId, child_org_id: partner.organizationId }, data: { status: "TERMINATED" } })

    const url = `${BASE}/internal-chat/conversations/${conversationId}/messages`
    expect((await listMessages(withSession(url, partner.token), params(conversationId))).status).toBe(404)
    expect((await sendMessage(post(url, partner.token, { content: "còn đó không" }), params(conversationId))).status).toBe(404)
    const list = (await readJson(await listConversations(withSession(`${BASE}/internal-chat/conversations`, partner.token)))) as { data: { id: string }[] }
    expect(list.data.map((c) => c.id)).not.toContain(conversationId)
    // Chuỗi vẫn xem lịch sử
    expect((await listMessages(withSession(url, chain.token), params(conversationId))).status).toBe(200)
  })

  it("không gắn được đơn của tổ chức khác vào phòng của mình (thẻ đơn không bị đăng sang phòng lạ)", async () => {
    const orderId = await orderOf(chain)
    const hijack = await createConversation(post(`${BASE}/internal-chat/conversations`, stranger.token, { conversationType: "ORDER_THREAD", orderId }))
    expect(hijack.status).toBe(404)
    expect(await prisma.internal_chat_conversations.count({ where: { order_id: orderId } })).toBe(0)

    await dispatchToChat(post(`${BASE}/coordinator/orders/${orderId}/dispatch-to-chat`, chain.token, { targetPartnerOrgId: partner.organizationId }), params(orderId))
    const rooms = await prisma.internal_chat_conversations.findMany({ where: { order_id: orderId } })
    expect(rooms.map((r) => r.organization_id)).toEqual([chain.organizationId])
  })

  it("đọc trang tin mới nhất, phân trang lùi đúng, đếm chưa đọc thật", async () => {
    const { conversationId } = await dispatchCard()
    const base = Date.now() - 60 * 60_000
    await prisma.internal_chat_messages.createMany({
      data: Array.from({ length: 60 }, (_, i) => ({
        conversation_id: conversationId,
        organization_id: chain.organizationId,
        sender_user_id: partner.userId,
        sender_role: "cua_hang",
        message_type: "TEXT",
        content: `tin ${i}`,
        created_at: new Date(base + i * 1000),
      })),
    })
    await prisma.internal_chat_participants.updateMany({ where: { conversation_id: conversationId, user_id: chain.userId }, data: { last_read_at: new Date(base + 56 * 1000) } })

    const list = (await readJson(await listConversations(withSession(`${BASE}/internal-chat/conversations`, chain.token)))) as { data: { id: string; unreadCount: number }[] }
    // tin 57, 58, 59 của đối tác sau mốc đã đọc; thẻ đơn do chính chuỗi gửi không tính
    expect(list.data.find((c) => c.id === conversationId)?.unreadCount).toBe(3)

    const url = `${BASE}/internal-chat/conversations/${conversationId}/messages`
    // 61 tin: 60 tin cũ + thẻ đơn (mới nhất) → trang đầu = 50 tin mới nhất, theo thứ tự cũ → mới
    type Page = { data: { content: string; messageType: string }[]; nextCursor: string | null }
    const first = (await readJson(await listMessages(withSession(`${url}?limit=50`, chain.token), params(conversationId)))) as Page
    expect(first.data).toHaveLength(50)
    expect(first.data.at(-1)?.messageType).toBe("ACTION_CARD_ORDER")
    expect(first.data.at(-2)?.content).toBe("tin 59")
    expect(first.data[0]?.content).toBe("tin 11")
    expect(first.nextCursor).toBeTruthy()

    const second = (await readJson(await listMessages(withSession(`${url}?before=${encodeURIComponent(first.nextCursor!)}`, chain.token), params(conversationId)))) as Page
    expect(second.data.map((m) => m.content)).toEqual(Array.from({ length: 11 }, (_, i) => `tin ${i}`))
    expect(second.nextCursor).toBeNull()

    expect((await listMessages(withSession(`${url}?before=rac`, chain.token), params(conversationId))).status).toBe(400)
  })
})
