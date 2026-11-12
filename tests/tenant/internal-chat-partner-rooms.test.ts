import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as listConversations, POST as createConversation } from "@/app/api/v1/internal-chat/conversations/route"
import { GET as listMessages, POST as sendMessage } from "@/app/api/v1/internal-chat/conversations/[id]/messages/route"
import { POST as acceptLink } from "@/app/api/v1/chain/links/[id]/accept/route"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, linkPartner, makeChainOrganization, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Chat nội bộ GĐ2 (`docs/plan/hoan-thien-chat-noi-bo.md`, PO duyệt D1, D7, D10): mỗi liên kết chuỗi → cửa hàng có
 * đúng một phòng; mọi nhân viên có quyền ở hai bên vào được không cần mời; tạm dừng = chỉ đọc; chuỗi khác không
 * thấy; phòng chi nhánh chỉ cho đúng chi nhánh.
 */
describe("cách ly tenant — phòng trao đổi theo đối tác", () => {
  let chain: Tenant
  let partner: Tenant
  let otherChain: Tenant
  const BASE = "http://localhost/api/v1"
  const params = (id: string) => ({ params: Promise.resolve({ id }) })
  const post = (url: string, token: string, body: unknown) => withSession(url, token, { method: "POST", body: JSON.stringify(body) })
  const open = (token: string, body: unknown) => createConversation(post(`${BASE}/internal-chat/conversations`, token, body))
  const roomsOf = async (token: string) =>
    ((await readJson(await listConversations(withSession(`${BASE}/internal-chat/conversations`, token)))) as { data: { id: string; counterpartName?: string }[] }).data
  const messagesUrl = (id: string) => `${BASE}/internal-chat/conversations/${id}/messages`

  beforeEach(async () => {
    await resetDatabase()
    chain = await createTenant("chuoi")
    partner = await createTenant("doitac")
    otherChain = await createTenant("chuoikhac")
    await makeChainOrganization(chain)
    await makeChainOrganization(otherChain)
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function openedRoom(): Promise<string> {
    const res = await open(chain.token, { partner_org_id: partner.organizationId })
    expect(res.status).toBe(200)
    return ((await readJson(res)) as { data: { id: string } }).data.id
  }

  it("một liên kết một phòng: chuỗi và cửa hàng mở từ hai phía ra cùng phòng, mở lại không sinh phòng mới", async () => {
    await linkPartner(chain, partner, { code: "P-01" })
    const fromChain = await openedRoom()
    const again = await openedRoom()
    const fromStore = ((await readJson(await open(partner.token, { chain_org_id: chain.organizationId }))) as { data: { id: string } }).data.id
    expect(new Set([fromChain, again, fromStore]).size).toBe(1)
    expect(await prisma.internal_chat_conversations.count({ where: { counterpart_org_id: partner.organizationId } })).toBe(1)

    const storeRooms = await roomsOf(partner.token)
    expect(storeRooms.find((r) => r.id === fromChain)?.counterpartName).toBe("Tiệm hoa chuoi")
  })

  it("nhân viên mới của cửa hàng thấy phòng ngay, đọc và gửi được; chuỗi khác không thấy, không mở được", async () => {
    await linkPartner(chain, partner, { code: "P-01" })
    const roomId = await openedRoom()
    const staff = await addStaffWithSession(partner, "cua_hang", "nhan-vien-moi")

    expect((await roomsOf(staff.token)).map((r) => r.id)).toContain(roomId)
    expect((await sendMessage(post(messagesUrl(roomId), staff.token, { content: "Tiệm đã nhận tin" }), params(roomId))).status).toBe(200)
    const page = (await readJson(await listMessages(withSession(messagesUrl(roomId), chain.token), params(roomId)))) as { data: { content: string }[] }
    expect(page.data.map((m) => m.content)).toContain("Tiệm đã nhận tin")

    expect((await roomsOf(otherChain.token)).map((r) => r.id)).not.toContain(roomId)
    expect((await listMessages(withSession(messagesUrl(roomId), otherChain.token), params(roomId))).status).toBe(404)
    expect((await open(otherChain.token, { partner_org_id: partner.organizationId })).status).toBe(404)
  })

  it("liên kết tạm dừng: cửa hàng vẫn đọc nhưng không gửi; chưa liên kết / chờ đồng ý: không mở được", async () => {
    await linkPartner(chain, partner, { code: "P-01" })
    const roomId = await openedRoom()
    await prisma.organization_links.updateMany({ where: { parent_org_id: chain.organizationId, child_org_id: partner.organizationId }, data: { status: "SUSPENDED" } })

    expect((await listMessages(withSession(messagesUrl(roomId), partner.token), params(roomId))).status).toBe(200)
    expect((await sendMessage(post(messagesUrl(roomId), partner.token, { content: "còn làm không" }), params(roomId))).status).toBe(404)
    expect((await roomsOf(partner.token)).map((r) => r.id)).toContain(roomId)

    const pendingStore = await createTenant("chodongy")
    await linkPartner(chain, pendingStore, { code: "P-02", status: "PENDING" })
    expect((await open(chain.token, { partner_org_id: pendingStore.organizationId })).status).toBe(404)
  })

  it("cửa hàng đồng ý lời mời → phòng trao đổi có sẵn cho cả hai bên", async () => {
    const linkId = await linkPartner(chain, partner, { code: "P-01", status: "PENDING" })
    const res = await acceptLink(withSession(`${BASE}/chain/links/${linkId}/accept`, partner.token, { method: "POST" }), params(linkId))
    expect(res.status).toBe(200)
    const rooms = await prisma.internal_chat_conversations.findMany({ where: { organization_id: chain.organizationId, counterpart_org_id: partner.organizationId } })
    expect(rooms).toHaveLength(1)
    expect((await roomsOf(chain.token)).map((r) => r.id)).toContain(rooms[0]!.id)
    expect((await roomsOf(partner.token)).map((r) => r.id)).toContain(rooms[0]!.id)
  })

  it("phòng chi nhánh: nhân viên gắn chi nhánh khác không thấy, không đọc; chi nhánh của tổ chức khác không mở được", async () => {
    const b1 = await prisma.branches.create({ data: { organization_id: chain.organizationId, code: "CN1", name: "Chi nhánh 1" } })
    const b2 = await prisma.branches.create({ data: { organization_id: chain.organizationId, code: "CN2", name: "Chi nhánh 2" } })
    const res = await open(chain.token, { branch_id: b1.id })
    expect(res.status).toBe(200)
    const roomId = ((await readJson(res)) as { data: { id: string } }).data.id

    const staffB2 = await addStaffWithSession(chain, "cua_hang", "nv-cn2")
    await prisma.memberships.updateMany({ where: { user_id: staffB2.userId }, data: { branch_id: b2.id } })
    expect((await roomsOf(staffB2.token)).map((r) => r.id)).not.toContain(roomId)
    expect((await listMessages(withSession(messagesUrl(roomId), staffB2.token), params(roomId))).status).toBe(404)

    expect((await open(otherChain.token, { branch_id: b1.id })).status).toBe(404)
  })
})
