import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as openRoom } from "@/app/api/v1/internal-chat/conversations/route"
import { GET as listMessages } from "@/app/api/v1/internal-chat/conversations/[id]/messages/route"
import { POST as sendImages } from "@/app/api/v1/internal-chat/conversations/[id]/images/route"
import { GET as readStorage } from "@/app/api/v1/storage/[...key]/route"
import { countPayloadReferences } from "@/modules/assets/infra/payload-references"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, linkPartner, makeChainOrganization, readJson, withSession, type Tenant } from "../helpers/fixtures"

const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 0, 1, 0, 0])

/**
 * Kế hoạch chat nội bộ GĐ8 (PO P4, D6): ảnh trong tin nhắn tự do — kiểm byte thật, lưu dưới tổ chức chủ phòng, chỉ
 * phát URL ký có hạn cho người vào được phòng; tổ chức khác không gửi / không đọc được; registry đếm được tham chiếu.
 */
describe("cách ly tenant — ảnh trong phòng trao đổi", () => {
  let chain: Tenant
  let partner: Tenant
  let stranger: Tenant
  let roomId: string
  const BASE = "http://localhost/api/v1"
  const params = <T>(v: T) => ({ params: Promise.resolve(v) })

  beforeEach(async () => {
    await resetDatabase()
    chain = await createTenant("chuoi")
    partner = await createTenant("doitac")
    stranger = await createTenant("nguoila")
    await makeChainOrganization(chain)
    await linkPartner(chain, partner, { code: "P-01" })
    const res = await openRoom(withSession(`${BASE}/internal-chat/conversations`, chain.token, { method: "POST", body: JSON.stringify({ partnerOrgId: partner.organizationId }) }))
    roomId = ((await readJson(res)) as { data: { id: string } }).data.id
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  function upload(token: string, files: Uint8Array[], caption = "") {
    const form = new FormData()
    files.forEach((bytes, i) => form.append("files", new Blob([new Uint8Array(bytes)], { type: "image/jpeg" }), `anh-${i}.jpg`))
    form.append("caption", caption)
    const req = withSession(`${BASE}/internal-chat/conversations/${roomId}/images`, token)
    return sendImages(new Request(req.url, { method: "POST", headers: { cookie: req.headers.get("cookie")! }, body: form }), params({ id: roomId }))
  }

  it("cửa hàng gửi ảnh → chuỗi thấy tin ảnh với URL ký mở được; registry đếm được tham chiếu", async () => {
    const res = await upload(partner.token, [JPG], "Mẫu hoa hôm nay")
    expect(res.status).toBe(201)
    const key = ((await readJson(res)) as { data: { attachments: string[] } }).data.attachments[0]!
    expect(key.startsWith(`org/${chain.organizationId}/chat-${roomId}/`)).toBe(true)

    const page = (await readJson(await listMessages(withSession(`${BASE}/internal-chat/conversations/${roomId}/messages`, chain.token), params({ id: roomId })))) as {
      data: Array<{ messageType: string; content: string; attachments: string[] }>
    }
    const image = page.data.find((m) => m.messageType === "IMAGE")!
    expect(image.content).toBe("Mẫu hoa hôm nay")
    const url = new URL(image.attachments[0]!, "http://localhost")
    expect(url.searchParams.size).toBeGreaterThan(0) // có chữ ký + hạn
    const file = await readStorage(new Request(url), params({ key: url.pathname.replace(/^\/api\/v1\/storage\//, "").split("/") }))
    expect(file.status).toBe(200)

    const ctx = { organizationId: chain.organizationId, workspaceId: "w", userId: chain.userId, branchId: null, capabilities: new Set<string>() }
    expect(await countPayloadReferences(ctx, key)).toBe(1)
  })

  it("tổ chức khác không gửi được ảnh vào phòng; tệp không phải ảnh bị chặn và không tạo tin", async () => {
    expect((await upload(stranger.token, [JPG])).status).toBe(404)
    expect((await upload(partner.token, [new TextEncoder().encode("<svg onload=alert(1)>")])).status).toBe(400)
    expect(await prisma.internal_chat_messages.count({ where: { conversation_id: roomId, message_type: "IMAGE" } })).toBe(0)
  })

  it("liên kết tạm dừng: cửa hàng không gửi được ảnh", async () => {
    await prisma.organization_links.updateMany({ where: { parent_org_id: chain.organizationId, child_org_id: partner.organizationId }, data: { status: "SUSPENDED" } })
    expect((await upload(partner.token, [JPG])).status).toBe(404)
  })
})
