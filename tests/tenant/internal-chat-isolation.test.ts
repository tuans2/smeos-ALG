import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as listConversations, POST as createConversation } from "@/app/api/v1/internal-chat/conversations/route"
import { GET as listMessages, POST as sendMessage } from "@/app/api/v1/internal-chat/conversations/[id]/messages/route"
import { PATCH as patchPartnerStatus } from "@/app/api/v1/coordinator/partners/[id]/status/route"
import { POST as dispatchToChat } from "@/app/api/v1/coordinator/orders/[id]/dispatch-to-chat/route"
import { POST as createOrder } from "@/app/api/v1/orders/route"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, linkPartner, makeChainOrganization, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Chat nội bộ + điều phối sang đối tác (audit PR #63): không đọc/tham gia hội thoại của tổ chức khác,
 * không mời người ngoài, không đổi trạng thái đối tác của chuỗi khác, không đẩy đơn sang tổ chức
 * không phải đối tác. Mọi trường hợp → 404.
 */
describe("cách ly tenant — chat nội bộ và điều phối đối tác", () => {
  let a: Tenant
  let b: Tenant
  let partner: Tenant
  const BASE = "http://localhost/api/v1"
  const params = (id: string) => ({ params: Promise.resolve({ id }) })

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    partner = await createTenant("doitac")
    await makeChainOrganization(a)
    await linkPartner(a, partner, { code: "P-01" })
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function orderOf(t: Tenant): Promise<string> {
    const res = await createOrder(withSession(`${BASE}/orders`, t.token, { method: "POST", body: JSON.stringify({ items: [{ description: "Bó hoa", quantity: 1, unitPriceVnd: 300000 }] }) }))
    return ((await readJson(res)) as { order: { id: string } }).order.id
  }

  async function conversationOf(t: Tenant, orderId?: string): Promise<string> {
    const res = await createConversation(withSession(`${BASE}/internal-chat/conversations`, t.token, { method: "POST", body: JSON.stringify({ conversation_type: "ORDER_THREAD", ...(orderId ? { order_id: orderId } : {}) }) }))
    expect(res.status).toBe(200)
    return ((await readJson(res)) as { data: { id: string } }).data.id
  }

  it("người ngoài không đọc, không gửi tin vào hội thoại của tổ chức khác; danh sách không lộ", async () => {
    const convId = await conversationOf(a)
    expect((await listMessages(withSession(`${BASE}/internal-chat/conversations/${convId}/messages`, b.token), params(convId))).status).toBe(404)
    const send = await sendMessage(withSession(`${BASE}/internal-chat/conversations/${convId}/messages`, b.token, { method: "POST", body: JSON.stringify({ content: "chào" }) }), params(convId))
    expect(send.status).toBe(404)
    const list = (await readJson(await listConversations(withSession(`${BASE}/internal-chat/conversations`, b.token)))) as { data: { id: string }[] }
    expect(list.data.map((c) => c.id)).not.toContain(convId)
  })

  it("không tự tham gia luồng đơn của tổ chức khác bằng orderId", async () => {
    const orderId = await orderOf(a)
    const convId = await conversationOf(a, orderId)
    const res = await createConversation(withSession(`${BASE}/internal-chat/conversations`, b.token, { method: "POST", body: JSON.stringify({ conversation_type: "ORDER_THREAD", order_id: orderId }) }))
    expect(res.status).toBe(404)
    expect(await prisma.internal_chat_participants.count({ where: { conversation_id: convId, user_id: b.userId } })).toBe(0)
  })

  it("không kéo người của tổ chức không liên kết vào hội thoại", async () => {
    const res = await createConversation(withSession(`${BASE}/internal-chat/conversations`, a.token, { method: "POST", body: JSON.stringify({ conversation_type: "CHAIN_PARTNER", target_organization_id: b.organizationId, target_user_id: b.userId }) }))
    expect(res.status).toBe(404)
    const ok = await createConversation(withSession(`${BASE}/internal-chat/conversations`, a.token, { method: "POST", body: JSON.stringify({ conversation_type: "CHAIN_PARTNER", target_organization_id: partner.organizationId, target_user_id: partner.userId }) }))
    expect(ok.status).toBe(200)
  })

  it("chuỗi khác không đổi được trạng thái đối tác", async () => {
    const link = await prisma.organization_links.findFirstOrThrow({ where: { parent_org_id: a.organizationId } })
    const res = await patchPartnerStatus(withSession(`${BASE}/coordinator/partners/${link.id}/status`, b.token, { method: "PATCH", body: JSON.stringify({ status: "TERMINATED" }) }), params(link.id))
    expect(res.status).toBe(404)
    expect((await prisma.organization_links.findUniqueOrThrow({ where: { id: link.id } })).status).toBe("ACTIVE")
  })

  it("chỉ đẩy đơn sang đối tác ACTIVE của chính chuỗi", async () => {
    const orderId = await orderOf(a)
    const toStranger = await dispatchToChat(withSession(`${BASE}/coordinator/orders/${orderId}/dispatch-to-chat`, a.token, { method: "POST", body: JSON.stringify({ targetPartnerOrgId: b.organizationId }) }), params(orderId))
    expect(toStranger.status).toBe(404)
    const toPartner = await dispatchToChat(withSession(`${BASE}/coordinator/orders/${orderId}/dispatch-to-chat`, a.token, { method: "POST", body: JSON.stringify({ targetPartnerOrgId: partner.organizationId }) }), params(orderId))
    expect(toPartner.status).toBe(200)
  })
})
