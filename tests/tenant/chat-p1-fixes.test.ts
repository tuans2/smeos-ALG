import { randomUUID } from "node:crypto"

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

// Cổng AI giả lập: lượt `chat_answer` trả một câu cố định — không gọi nhà cung cấp thật.
vi.mock("@/core/ai/gateway", () => ({
  callCapability: async () => ({ kind: "xong", output: "Dạ, tiệm còn bó hồng đỏ ạ." }),
}))

import { POST as widget } from "@/app/api/v1/chat/public/widget/route"
import { POST as dispatchToChat } from "@/app/api/v1/coordinator/orders/[id]/dispatch-to-chat/route"
import { POST as createOrder } from "@/app/api/v1/orders/route"
import { POST as cardAction } from "@/app/api/v1/internal-chat/messages/[id]/action/route"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, linkPartner, makeChainOrganization, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Hai lỗi P1 phát hiện khi viết OpenAPI nội bộ (audit API §15, 08/11/2026):
 * 1. Bấm nút thẻ đơn ở chat nội bộ không kiểm tổ chức/người tham gia — sửa được thẻ của tổ chức khác.
 * 2. Trả lời AI qua kênh ngoài trừ credit rồi ghi sổ `usage` với `workspace_id: "system"` — vỡ khoá ngoại, khách nhận 500.
 */
const BASE = "http://localhost/api/v1"
const ps = (id: string) => ({ params: Promise.resolve({ id }) })

describe("chat — cách ly thẻ hành động và sổ credit kênh ngoài", () => {
  let a: Tenant
  let b: Tenant
  let partner: Tenant
  const send = (who: Tenant, path: string, body: unknown) => withSession(`${BASE}${path}`, who.token, { method: "POST", body: JSON.stringify(body) })

  beforeAll(async () => {
    await resetDatabase()
    a = await createTenant("p1-chat-a")
    b = await createTenant("p1-chat-b")
    partner = await createTenant("p1-chat-doi-tac")
    await makeChainOrganization(a)
    await linkPartner(a, partner, { code: "P1-01" })
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  /**
   * Thẻ đơn thật: chuỗi `a` liên kết cửa hàng đối tác `partner`, Điều phối giao đơn vào chat (kế hoạch chat nội bộ GĐ1 —
   * client không tự tạo phòng PLATFORM_TENANT hay gửi thẻ). `b` là tổ chức thứ ba.
   */
  async function orderCard() {
    const order = await readJson(await createOrder(send(a, "/orders", { items: [{ description: "Bó hoa", quantity: 1, unitPriceVnd: 300000 }] })))
    const orderId = String((order as { order: { id: string } }).order.id)
    const res = await dispatchToChat(send(a, `/coordinator/orders/${orderId}/dispatch-to-chat`, { targetPartnerOrgId: partner.organizationId, targetPartnerUserId: partner.userId }), ps(orderId))
    expect(res.status).toBe(200)
    const data = ((await readJson(res)) as { data: { conversationId: string; message: { id: string; actionPayload: Record<string, unknown> } } }).data
    return { convId: data.conversationId, cardId: data.message.id, payload: data.message.actionPayload }
  }

  it("tổ chức khác bấm nút trên thẻ đơn → 404, thẻ và hội thoại không đổi", async () => {
    const { convId, cardId, payload } = await orderCard()
    const before = await prisma.internal_chat_messages.count({ where: { conversation_id: convId } })
    const res = await cardAction(send(b, `/internal-chat/messages/${cardId}/action`, { action: "REJECT_ORDER", rejectedReason: "thử" }), ps(cardId))
    expect(res.status).toBe(404)
    const row = await prisma.internal_chat_messages.findUniqueOrThrow({ where: { id: cardId } })
    expect(row.action_payload).toEqual(payload)
    expect(await prisma.internal_chat_messages.count({ where: { conversation_id: convId } })).toBe(before)
  })

  it("mã tin không tồn tại → 404 (trước đây 500)", async () => {
    const id = randomUUID()
    expect((await cardAction(send(a, `/internal-chat/messages/${id}/action`, { action: "ACCEPT_ORDER" }), ps(id))).status).toBe(404)
  })

  it("cửa hàng được giao bấm nhận đơn: đổi trạng thái, giữ mã đơn", async () => {
    const { cardId, payload } = await orderCard()
    const res = await cardAction(send(partner, `/internal-chat/messages/${cardId}/action`, { action: "ACCEPT_ORDER" }), ps(cardId))
    expect(res.status).toBe(200)
    const after = ((await readJson(res)).data as { actionPayload: Record<string, unknown> }).actionPayload
    expect(after).toMatchObject({ orderId: payload.orderId, orderCode: payload.orderCode, status: "ACCEPTED", assignedPartnerOrgId: partner.organizationId })
  })

  it("khung chat công khai của tiệm còn credit: trả lời, trừ 1 credit, ghi sổ usage vào workspace của tiệm", async () => {
    await prisma.organizations.update({ where: { id: a.organizationId }, data: { credit_balance: 10 } })
    const org = await prisma.organizations.findUniqueOrThrow({ where: { id: a.organizationId }, select: { slug: true } })
    const req = new Request(`${BASE}/chat/public/widget`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" },
      body: JSON.stringify({ slug: org.slug, visitorId: "khach-p1", message: "Tiệm còn hoa hồng không?" }),
    })
    const res = await widget(req as never)
    const body = await readJson(res)
    expect(res.status, JSON.stringify(body)).toBe(200)
    expect(String(body.conversationId)).not.toBe("")
    expect((await prisma.organizations.findUniqueOrThrow({ where: { id: a.organizationId } })).credit_balance).toBe(9)
    const usage = await prisma.usage.findMany({ where: { organization_id: a.organizationId, feature: "chat.message.ai_reply" } })
    const workspace = await prisma.workspaces.findFirstOrThrow({ where: { organization_id: a.organizationId }, orderBy: { created_at: "asc" } })
    expect(usage.map((u) => [u.workspace_id, u.cost_credit])).toEqual([[workspace.id, 1]])
  })
})
