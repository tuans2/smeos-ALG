import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as listConversations, POST as openRoom } from "@/app/api/v1/internal-chat/conversations/route"
import { PATCH as mute } from "@/app/api/v1/internal-chat/conversations/[id]/mute/route"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, linkPartner, makeChainOrganization, readJson, withSession, type Tenant } from "../helpers/fixtures"

/** IC-7.3: tắt tiếng phòng chỉ cho chính mình, chỉ phòng mình vào được; danh sách phòng phản ánh trạng thái. */
describe("cách ly tenant — tắt tiếng phòng trao đổi", () => {
  let chain: Tenant
  let partner: Tenant
  let stranger: Tenant
  let roomId: string
  const BASE = "http://localhost/api/v1"
  const patch = (t: Tenant, muted: boolean) =>
    mute(withSession(`${BASE}/internal-chat/conversations/${roomId}/mute`, t.token, { method: "PATCH", body: JSON.stringify({ muted }) }), { params: Promise.resolve({ id: roomId }) })
  const mutedFor = async (t: Tenant) =>
    ((await readJson(await listConversations(withSession(`${BASE}/internal-chat/conversations`, t.token)))) as { data: Array<{ id: string; isMuted: boolean }> }).data.find((c) => c.id === roomId)?.isMuted

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

  it("cửa hàng tắt tiếng phòng: chỉ mình cửa hàng thấy đã tắt; tổ chức khác không đổi được (404)", async () => {
    expect((await patch(partner, true)).status).toBe(200)
    expect(await mutedFor(partner)).toBe(true)
    expect(await mutedFor(chain)).toBe(false)
    expect((await patch(stranger, true)).status).toBe(404)
    expect((await patch(partner, false)).status).toBe(200)
    expect(await mutedFor(partner)).toBe(false)
  })
})
