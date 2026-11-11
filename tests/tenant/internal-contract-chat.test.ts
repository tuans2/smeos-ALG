import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

// Cổng AI giả lập: mọi lượt `chat_answer` trả một câu cố định — không gọi nhà cung cấp thật.
vi.mock("@/core/ai/gateway", () => ({
  callCapability: async () => ({ kind: "xong", output: "Dạ, tiệm gợi ý bó hồng đỏ cho dịp kỷ niệm ạ." }),
}))

import * as R from "@/app/api/v1/_contracts/responses-chat"
import { GET as listChannels, POST as configureChannel } from "@/app/api/v1/chat/channels/route"
import { POST as createOrder } from "@/app/api/v1/chat/conversations/[id]/create-order/route"
import { GET as listMessages, POST as sendMessage } from "@/app/api/v1/chat/conversations/[id]/messages/route"
import { GET as listConversations, POST as createConversation } from "@/app/api/v1/chat/conversations/route"
import { GET as getLimits, POST as requestLimits } from "@/app/api/v1/chat/public-limits/route"
import { POST as widget } from "@/app/api/v1/chat/public/widget/route"
// @release-strip — route/mô-đun không có trong bản giao GD1; phần còn lại của test vẫn chạy trên bản cắt
import { GET as fbVerify, POST as fbHook } from "@/app/api/v1/chat/webhooks/facebook/route"
import { POST as zaloHook } from "@/app/api/v1/chat/webhooks/zalo/route"
// @release-strip-end
import { GET as listInternalMessages, POST as sendInternal } from "@/app/api/v1/internal-chat/conversations/[id]/messages/route"
import { GET as listInternal, POST as createInternal } from "@/app/api/v1/internal-chat/conversations/route"
import { POST as cardAction } from "@/app/api/v1/internal-chat/messages/[id]/action/route"
import { POST as createProduct } from "@/app/api/v1/products/route"
import { POST as createOrderRoute } from "@/app/api/v1/orders/route"
import { POST as dispatchToChat } from "@/app/api/v1/coordinator/orders/[id]/dispatch-to-chat/route"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, linkPartner, makeChainOrganization, readJson, withSession, type Tenant } from "../helpers/fixtures"

/** Hợp đồng phản hồi `/chat/*` và `/internal-chat/*` (OpenAPI nội bộ, PO 07/11/2026) trên CSDL thật. */
const BASE = "http://localhost/api/v1"
const ps = (id: string) => ({ params: Promise.resolve({ id }) })

describe("hợp đồng — trợ lý AI và chat nội bộ", () => {
  let t: Tenant
  let other: Tenant
  const get = (path: string, who: Tenant = t) => withSession(`${BASE}${path}`, who.token)
  const send = (path: string, method: string, body?: unknown, who: Tenant = t) =>
    withSession(`${BASE}${path}`, who.token, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const raw = (path: string, body: string, headers: Record<string, string> = {}) =>
    new Request(`${BASE}${path}`, { method: "POST", body, headers: { "content-type": "application/json", ...headers } })

  beforeAll(async () => {
    await resetDatabase()
    t = await createTenant("hop-dong-chat")
    other = await createTenant("hop-dong-chat-khac")
    await prisma.organizations.update({ where: { id: t.organizationId }, data: { credit_balance: 500 } })
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("hội thoại tư vấn: tạo, danh sách, gửi câu hỏi, tin nhắn, chốt đơn nháp", async () => {
    const created = await expectContract(await createConversation(send("/chat/conversations", "POST", { title: "Khách hỏi hoa cưới" })), 201, R.chatConversationResponse, "chat-conv")
    const id = String((created.conversation as { id: string }).id)
    await expectContract(await listConversations(get("/chat/conversations?limit=10")), 200, R.chatConversationsResponse, "chat-convs")
    await expectContract(await sendMessage(send(`/chat/conversations/${id}/messages`, "POST", { query: "Có bó hồng đỏ không?" }), ps(id)), 200, R.chatSendMessageResponse, "chat-send")
    await expectContract(await listMessages(get(`/chat/conversations/${id}/messages`), ps(id)), 200, R.chatMessagesResponse, "chat-messages")
    expect((await listMessages(get(`/chat/conversations/${id}/messages`, other), ps(id))).status).toBe(404)

    const product = await readJson(
      await createProduct(send("/products", "POST", { name: "Bó hồng đỏ", category: "Bó hoa", cost_price_vnd: 250_000, attributes: { price_vnd: 550_000 } }))
    )
    await expectContract(
      await createOrder(send(`/chat/conversations/${id}/create-order`, "POST", { productId: product.id, recipientName: "Chị Lan", phone: "0901234567" }), ps(id)),
      201, R.chatCreateOrderResponse, "chat-create-order"
    )
    expect((await createOrder(send(`/chat/conversations/${id}/create-order`, "POST", {}), ps(id))).status).toBe(400)
  })

  it("kênh và hạn mức chat công khai", async () => {
    await expectContract(await listChannels(get("/chat/channels")), 200, R.chatChannelsResponse, "chat-channels")
    await expectContract(
      await configureChannel(send("/chat/channels", "POST", { channel: "STOREFRONT_CATALOG", isEnabled: true, config: { botName: "Trợ lý tiệm", zaloSecretKey: "bi-mat-123456" } })),
      200, R.chatChannelConfiguredResponse, "chat-channel-configure"
    )
    const limits = await expectContract(await getLimits(get("/chat/public-limits")), 200, R.publicChatLimitsResponse, "chat-limits")
    const current = limits.current as { perVisitor: number; perIp: number }
    const { PUBLIC_CHAT_LIMIT_TIERS } = await import("@/modules/chat-assistant/domain/public-chat-limit-request")
    const higher = PUBLIC_CHAT_LIMIT_TIERS.find((x) => x.perVisitor > current.perVisitor && x.perIp > current.perIp)!
    await expectContract(await requestLimits(send("/chat/public-limits", "POST", { perVisitor: higher.perVisitor, perIp: higher.perIp, note: "Mùa cưới" })), 201, R.publicChatLimitRequestedResponse, "chat-limits-request")
    expect((await requestLimits(send("/chat/public-limits", "POST", { perVisitor: higher.perVisitor, perIp: higher.perIp }))).status).toBe(409)
  })

  it("khung chat công khai: trả lời theo slug; tiệm lạ 404 và thân sai 400 với lỗi dạng chuỗi", async () => {
    // Tiệm hết credit → trợ lý trả câu mời chờ nhân viên (vẫn 200, cùng hình dạng). Nhánh còn credit: `chat-p1-fixes.test.ts`.
    await prisma.organizations.update({ where: { id: other.organizationId }, data: { credit_balance: 0 } })
    const org = await prisma.organizations.findUniqueOrThrow({ where: { id: other.organizationId }, select: { slug: true } })
    const visit = (body: unknown) => widget(raw("/chat/public/widget", JSON.stringify(body), { "x-forwarded-for": "203.0.113.7" }) as never)
    await expectContract(await visit({ slug: org.slug, visitorId: "khach-1", message: "Tiệm có giao hoa tối nay không?" }), 200, R.publicChatWidgetResponse, "chat-widget")
    const missing = await visit({ slug: "khong-co-tiem-nay", visitorId: "khach-1", message: "Xin chào" })
    expect([missing.status, typeof (await readJson(missing)).error]).toEqual([404, "string"])
    const bad = await visit({ slug: org.slug })
    expect([bad.status, typeof (await readJson(bad)).error]).toEqual([400, "string"])
  })

  // @release-strip
  it("webhook kênh chat từ chối khi không xác minh được", async () => {
    expect((await fbVerify(new Request(`${BASE}/chat/webhooks/facebook?hub.mode=subscribe&hub.verify_token=sai&hub.challenge=1`) as never)).status).toBe(403)
    expect((await fbHook(raw("/chat/webhooks/facebook", JSON.stringify({ object: "page", entry: [] }), { "x-hub-signature-256": "sha256=00" }) as never)).status).toBe(401)
    expect((await zaloHook(raw("/chat/webhooks/zalo", "{không phải json") as never)).status).toBe(400)
    expect((await zaloHook(raw("/chat/webhooks/zalo", JSON.stringify({ oa_id: "oa-la", event_name: "user_send_text" })) as never)).status).toBe(401)
  })
  // @release-strip-end

  it("chat nội bộ: mở phòng đối tác, danh sách, gửi tin, tin nhắn, bấm nút trên thẻ đơn", async () => {
    // Luồng thật (kế hoạch chat nội bộ GĐ1–3): chuỗi liên kết cửa hàng đối tác; client không tự tạo phòng
    // PLATFORM_TENANT hay gửi thẻ — thẻ đơn do Điều phối giao vào chat.
    const partner = await createTenant("hop-dong-chat-doi-tac")
    await makeChainOrganization(t)
    await linkPartner(t, partner, { code: "HD-01" })

    const room = await expectContract(await createInternal(send("/internal-chat/conversations", "POST", { partnerOrgId: partner.organizationId })), 200, R.internalConversationResponse, "ichat-conv")
    const id = String((room.data as { id: string }).id)
    await expectContract(await listInternal(get("/internal-chat/conversations")), 200, R.internalConversationsResponse, "ichat-convs")
    await expectContract(await sendInternal(send(`/internal-chat/conversations/${id}/messages`, "POST", { content: "Chiều nay có đơn cho tiệm" }), ps(id)), 200, R.internalMessageResponse, "ichat-send")
    await expectContract(await listInternalMessages(get(`/internal-chat/conversations/${id}/messages`), ps(id)), 200, R.internalMessagesResponse, "ichat-messages")
    expect((await listInternalMessages(get(`/internal-chat/conversations/${id}/messages`, other), ps(id))).status).toBe(404)

    const order = await readJson(await createOrderRoute(send("/orders", "POST", { items: [{ description: "Bó hoa", quantity: 1, unitPriceVnd: 300000 }] })))
    const orderId = String((order as { order: { id: string } }).order.id)
    const dispatched = await readJson(await dispatchToChat(
      send(`/coordinator/orders/${orderId}/dispatch-to-chat`, "POST", { targetPartnerOrgId: partner.organizationId, targetPartnerUserId: partner.userId }), ps(orderId)
    ))
    const cardId = String((dispatched as { data: { message: { id: string } } }).data.message.id)
    await expectContract(await cardAction(send(`/internal-chat/messages/${cardId}/action`, "POST", { action: "ACCEPT_ORDER" }, partner), ps(cardId)), 200, R.internalMessageResponse, "ichat-action")
  })
})
