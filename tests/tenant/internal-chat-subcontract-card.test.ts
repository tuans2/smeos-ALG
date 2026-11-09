import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as acceptLink } from "@/app/api/v1/chain/links/[id]/accept/route"
import { POST as chainDispatch } from "@/app/api/v1/greeting-card/orders/[id]/chain-dispatch/route"
import { GET as listMessages } from "@/app/api/v1/internal-chat/conversations/[id]/messages/route"
import { GET as subcontractCard } from "@/app/api/v1/public/subcontract/[orderCode]/route"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, linkPartner, makeChainOrganization, readJson, withSession, type Tenant } from "../helpers/fixtures"

type CardMessage = {
  messageType: string
  actionPayload: { orderCode?: string; branchCode?: string }
  subcontractView?: { stage: string; closedReason: string | null; actionUrl: string | null }
}

/**
 * Kế hoạch chat nội bộ GĐ4–5 (PO P1–P3): bộ máy bắn đơn mời cửa hàng đối tác → thẻ đơn hiện trong phòng chung với
 * chuỗi, trạng thái tính từ đơn thật; chỉ người của đúng cửa hàng được mời, có quyền thực hiện đơn, nhận link Thẻ
 * Gia Công (để nhận, chốt, gửi ảnh như link Telegram). Chuỗi khác không đọc được thẻ.
 */
describe("cách ly tenant — thẻ đơn gia công trong phòng trao đổi", () => {
  let chain: Tenant
  let partner: Tenant
  let otherChain: Tenant
  let roomId: string
  const BASE = "http://localhost/api/v1"
  const params = <T>(v: T) => ({ params: Promise.resolve(v) })

  beforeEach(async () => {
    await resetDatabase()
    chain = await createTenant("chuoi")
    partner = await createTenant("doitac")
    otherChain = await createTenant("chuoikhac")
    await makeChainOrganization(chain)
    const linkId = await linkPartner(chain, partner, { code: "HN-01", status: "PENDING" })
    await acceptLink(withSession(`${BASE}/chain/links/${linkId}/accept`, partner.token, { method: "POST" }), params({ id: linkId }))
    roomId = (await prisma.internal_chat_conversations.findFirstOrThrow({ where: { counterpart_org_id: partner.organizationId } })).id
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function dispatchToPartner(): Promise<{ orderId: string; orderCode: string }> {
    const order = await prisma.orders.create({
      data: {
        organization_id: chain.organizationId, code: "DH-CHAT-1", source: "BROCHURE", status: "CONFIRMED",
        total_vnd: 600_000, paid_vnd: 600_000, balance_vnd: 0, created_by: "test",
        delivery_address: { street: "5 Xuân Thuỷ, Cầu Giấy, Hà Nội", parts: { houseNumber: "5", street: "Xuân Thuỷ", ward: "Dịch Vọng Hậu", province: "Hà Nội" } },
      },
    })
    const res = await chainDispatch(
      withSession(`${BASE}/greeting-card/orders/${order.id}/chain-dispatch`, chain.token, { method: "POST", body: JSON.stringify({ approvedBranchIds: ["DT-HN-01"] }) }),
      params({ id: order.id })
    )
    expect(res.status).toBe(200)
    const data = (await readJson(res)).data as { results: Array<{ branchId: string; sent: boolean }> }
    // Cửa hàng không có Telegram / Zalo vẫn tính là đã gửi — qua Trao đổi nội bộ
    expect(data.results).toEqual([expect.objectContaining({ branchId: "DT-HN-01", sent: true })])
    return { orderId: order.id, orderCode: order.code }
  }

  async function cardsFor(token: string): Promise<{ status: number; cards: CardMessage[] }> {
    const res = await listMessages(withSession(`${BASE}/internal-chat/conversations/${roomId}/messages`, token), params({ id: roomId }))
    if (res.status !== 200) return { status: res.status, cards: [] }
    const page = (await readJson(res)) as { data: CardMessage[] }
    return { status: 200, cards: page.data.filter((m) => m.messageType === "ACTION_CARD_SUBCONTRACT") }
  }

  it("lời mời bắn đơn thành thẻ trong phòng; cửa hàng được mời có link Thẻ Gia Công mở được, chuỗi thì không", async () => {
    const { orderCode } = await dispatchToPartner()

    const store = await cardsFor(partner.token)
    expect(store.cards).toHaveLength(1)
    const card = store.cards[0]!
    expect(card.actionPayload).toMatchObject({ orderCode, branchCode: "DT-HN-01" })
    expect(card.subcontractView).toMatchObject({ stage: "INVITED", closedReason: null })
    expect(card.subcontractView?.actionUrl).toContain(`/subcontract/${orderCode}`)

    // Link mở đúng Thẻ Gia Công có sẵn (cùng cổng với link Telegram)
    const url = new URL(card.subcontractView!.actionUrl!, "http://localhost")
    const opened = await subcontractCard(new Request(`${BASE}/public/subcontract/${orderCode}${url.search}`), params({ orderCode }))
    expect(opened.status).toBe(200)

    const chainView = await cardsFor(chain.token)
    expect(chainView.cards[0]?.subcontractView).toMatchObject({ stage: "INVITED", actionUrl: null })
  })

  it("nơi khác đã nhận → thẻ của cửa hàng chuyển 'đã có nơi nhận', không còn link", async () => {
    const { orderId } = await dispatchToPartner()
    const row = await prisma.order_coordinations.findFirstOrThrow({ where: { order_id: orderId } })
    const meta = row.metadata as { subcontract_dispatch: Record<string, unknown> }
    await prisma.order_coordinations.update({
      where: { id: row.id },
      data: { metadata: { ...meta, subcontract_dispatch: { ...meta.subcontract_dispatch, dispatchStatus: "CLAIMED_GRACE", claimedBranchId: "CN-KHAC" } } },
    })
    const store = await cardsFor(partner.token)
    expect(store.cards[0]?.subcontractView).toMatchObject({ stage: "CLOSED", closedReason: "TAKEN", actionUrl: null })
  })

  it("nhân viên cửa hàng không có quyền thực hiện đơn thấy thẻ nhưng không có link; chuỗi khác không đọc được phòng", async () => {
    await dispatchToPartner()
    const accountant = await addStaffWithSession(partner, "ke_toan", "ke-toan")
    const view = await cardsFor(accountant.token)
    expect(view.cards[0]?.subcontractView).toMatchObject({ stage: "INVITED", actionUrl: null })
    expect((await cardsFor(otherChain.token)).status).toBe(404)
  })
})
