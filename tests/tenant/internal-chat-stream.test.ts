import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as openRoom } from "@/app/api/v1/internal-chat/conversations/route"
import { POST as sendMessage } from "@/app/api/v1/internal-chat/conversations/[id]/messages/route"
import { GET as stream } from "@/app/api/v1/internal-chat/stream/route"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, linkPartner, makeChainOrganization, readJson, withSession, type Tenant } from "../helpers/fixtures"

/** Đọc luồng SSE tới khi gặp `needle` hoặc hết `ms`. */
async function readUntil(reader: ReadableStreamDefaultReader<Uint8Array>, needle: string, ms: number): Promise<string> {
  const decoder = new TextDecoder()
  let text = ""
  const deadline = Date.now() + ms
  while (Date.now() < deadline && !text.includes(needle)) {
    const chunk = await Promise.race([reader.read(), new Promise<null>((r) => setTimeout(() => r(null), Math.max(1, deadline - Date.now())))])
    if (!chunk || chunk.done) break
    text += decoder.decode(chunk.value)
  }
  return text
}

/**
 * Kế hoạch chat nội bộ IC-7.1: luồng đẩy báo mã phòng vừa có tin cho đúng tổ chức chủ phòng và bên kia; tổ chức thứ
 * ba không nhận gì; sự kiện không mang nội dung tin.
 */
describe("cách ly tenant — luồng đẩy SSE của trao đổi nội bộ", () => {
  let chain: Tenant
  let partner: Tenant
  let stranger: Tenant
  let roomId: string
  const BASE = "http://localhost/api/v1"

  beforeEach(async () => {
    delete process.env["REDIS_URL"]
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

  async function open(t: Tenant) {
    const abort = new AbortController()
    const req = withSession(`${BASE}/internal-chat/stream`, t.token)
    const res = await stream(new Request(req.url, { headers: req.headers, signal: abort.signal }))
    expect(res.status).toBe(200)
    const reader = res.body!.getReader()
    expect(await readUntil(reader, "event: connected", 2000)).toContain("event: connected")
    return { reader, close: () => abort.abort() }
  }

  it("chuỗi gửi tin → cửa hàng nhận sự kiện phòng (chỉ mã phòng); tổ chức thứ ba không nhận", async () => {
    const store = await open(partner)
    const third = await open(stranger)
    const send = await sendMessage(
      withSession(`${BASE}/internal-chat/conversations/${roomId}/messages`, chain.token, { method: "POST", body: JSON.stringify({ content: "Đơn gấp chiều nay" }) }),
      { params: Promise.resolve({ id: roomId }) }
    )
    expect(send.status).toBe(200)

    const got = await readUntil(store.reader, "event: room", 3000)
    expect(got).toContain(`"conversationId":"${roomId}"`)
    expect(got).not.toContain("Đơn gấp chiều nay")
    expect(await readUntil(third.reader, "event: room", 500)).not.toContain("event: room")
    store.close()
    third.close()
  })
})
