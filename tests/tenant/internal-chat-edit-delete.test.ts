import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as openRoom } from "@/app/api/v1/internal-chat/conversations/route"
import { GET as listMessages, POST as sendMessage } from "@/app/api/v1/internal-chat/conversations/[id]/messages/route"
import { POST as sendImages } from "@/app/api/v1/internal-chat/conversations/[id]/images/route"
import { DELETE as unsend, PATCH as edit } from "@/app/api/v1/internal-chat/messages/[id]/route"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, linkPartner, makeChainOrganization, readJson, withSession, type Tenant } from "../helpers/fixtures"

const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 0, 1, 0, 0])

/**
 * Sửa / thu hồi tin trong Trao đổi nội bộ: chỉ người gửi, tin chữ / ảnh, trong 24 giờ; thu hồi ảnh đưa tệp vào hàng
 * đợi xoá của kho dưới tổ chức chủ phòng; mọi thay đổi có nhật ký kiểm toán; tổ chức khác không đụng được.
 */
describe("cách ly tenant — sửa / thu hồi tin trao đổi nội bộ", () => {
  let chain: Tenant
  let partner: Tenant
  let stranger: Tenant
  let roomId: string
  const BASE = "http://localhost/api/v1"
  const idParams = (id: string) => ({ params: Promise.resolve({ id }) })

  beforeEach(async () => {
    await resetDatabase()
    chain = await createTenant("chuoi")
    partner = await createTenant("doitac")
    stranger = await createTenant("nguoila")
    await makeChainOrganization(chain)
    await linkPartner(chain, partner, { code: "P-01" })
    const res = await openRoom(withSession(`${BASE}/internal-chat/conversations`, chain.token, { method: "POST", body: JSON.stringify({ partner_org_id: partner.organizationId }) }))
    roomId = ((await readJson(res)) as { data: { id: string } }).data.id
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function say(t: Tenant, content: string): Promise<string> {
    const res = await sendMessage(withSession(`${BASE}/internal-chat/conversations/${roomId}/messages`, t.token, { method: "POST", body: JSON.stringify({ content }) }), idParams(roomId))
    return ((await readJson(res)) as { data: { id: string } }).data.id
  }
  const patch = (t: Tenant, id: string, content: string) =>
    edit(withSession(`${BASE}/internal-chat/messages/${id}`, t.token, { method: "PATCH", body: JSON.stringify({ content }) }), idParams(id))
  const remove = (t: Tenant, id: string) => unsend(withSession(`${BASE}/internal-chat/messages/${id}`, t.token, { method: "DELETE" }), idParams(id))
  const page = async (t: Tenant) =>
    ((await readJson(await listMessages(withSession(`${BASE}/internal-chat/conversations/${roomId}/messages`, t.token), idParams(roomId)))) as {
      data: Array<{ id: string; content: string; isDeleted: boolean; editedAt?: string; canChange?: boolean; attachments: string[] }>
    }).data

  it("người gửi sửa tin của mình; bên kia thấy nội dung mới và dấu đã sửa; người khác không sửa được", async () => {
    const id = await say(partner, "Giao 3 giờ")
    expect((await patch(chain, id, "sửa lén")).status).toBe(404)
    expect((await patch(stranger, id, "sửa lén")).status).toBe(404)
    expect((await patch(partner, id, "Giao 4 giờ")).status).toBe(200)

    const seen = (await page(chain)).find((m) => m.id === id)!
    expect(seen).toMatchObject({ content: "Giao 4 giờ" })
    expect(seen.editedAt).toBeTruthy()
    expect(seen.canChange).toBeUndefined()
    expect((await page(partner)).find((m) => m.id === id)?.canChange).toBe(true)
    expect(await prisma.audit_logs.count({ where: { action: "internal_chat.message.edit", entity_id: id } })).toBe(1)
  })

  it("cửa hàng thu hồi ảnh của mình: phòng còn dòng 'đã thu hồi', tệp vào hàng đợi xoá của chuỗi, có nhật ký", async () => {
    const form = new FormData()
    form.append("files", new Blob([new Uint8Array(JPG)], { type: "image/jpeg" }), "a.jpg")
    form.append("caption", "Mẫu")
    const req = withSession(`${BASE}/internal-chat/conversations/${roomId}/images`, partner.token)
    const sent = await sendImages(new Request(req.url, { method: "POST", headers: { cookie: req.headers.get("cookie")! }, body: form }), idParams(roomId))
    const msg = ((await readJson(sent)) as { data: { id: string; attachments: string[] } }).data
    const key = msg.attachments[0]!

    expect((await remove(stranger, msg.id)).status).toBe(404)
    expect((await remove(partner, msg.id)).status).toBe(200)
    expect((await remove(partner, msg.id)).status).toBe(409)

    const row = (await page(chain)).find((m) => m.id === msg.id)!
    expect(row).toMatchObject({ isDeleted: true, content: "", attachments: [] })
    const outbox = await prisma.storage_outbox.findFirstOrThrow({ where: { storage_key: key } })
    expect(outbox).toMatchObject({ organization_id: chain.organizationId, op: "DELETE", done_at: null })
    expect(await prisma.audit_logs.count({ where: { action: "internal_chat.message.delete", entity_id: msg.id } })).toBe(1)
  })

  it("quá 24 giờ: không sửa, không thu hồi (409)", async () => {
    const id = await say(chain, "cũ")
    await prisma.internal_chat_messages.update({ where: { id }, data: { created_at: new Date(Date.now() - 25 * 60 * 60 * 1000) } })
    expect((await patch(chain, id, "mới")).status).toBe(409)
    expect((await remove(chain, id)).status).toBe(409)
  })
})
