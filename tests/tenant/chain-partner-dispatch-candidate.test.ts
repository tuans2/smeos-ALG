import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as acceptLink } from "@/app/api/v1/chain/links/[id]/accept/route"
import { PATCH as patchPartnerStatus } from "@/app/api/v1/coordinator/partners/[id]/status/route"
import { ChainBranchRepository } from "@/modules/greeting-card/infra/chain-branch-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, linkPartner, makeChainOrganization, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Kế hoạch chat nội bộ GĐ3 (PO duyệt P1, D7, D9): cửa hàng đối tác đồng ý liên kết → vào vòng bắn đơn của ĐÚNG chuỗi
 * đó (một dòng `branches` mang `partner_org_id`); tạm dừng / chấm dứt → ra khỏi vòng; chuỗi khác không bao giờ thấy.
 */
describe("cách ly tenant — cửa hàng đối tác trong vòng bắn đơn", () => {
  let chain: Tenant
  let partner: Tenant
  let otherChain: Tenant
  const BASE = "http://localhost/api/v1"
  const params = (id: string) => ({ params: Promise.resolve({ id }) })

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

  const candidates = async (t: Tenant) => (await new ChainBranchRepository().listCandidates(t.organizationId)).map((b) => b.branchName)

  it("đồng ý lời mời → có trong vòng bắn đơn của chuỗi; chuỗi khác không có", async () => {
    const linkId = await linkPartner(chain, partner, { code: "HN-01", status: "PENDING" })
    expect(await candidates(chain)).toEqual([])

    const res = await acceptLink(withSession(`${BASE}/chain/links/${linkId}/accept`, partner.token, { method: "POST" }), params(linkId))
    expect(res.status).toBe(200)
    const row = await prisma.branches.findFirstOrThrow({ where: { organization_id: chain.organizationId, partner_org_id: partner.organizationId } })
    expect(row).toMatchObject({ code: "DT-HN-01", accepts_dispatch: true, is_active: true })
    expect(await candidates(chain)).toEqual(["Tiệm hoa doitac"])
    expect(await candidates(otherChain)).toEqual([])
  })

  it("chuỗi tạm dừng → ra khỏi vòng; mở lại → vào lại, không sinh dòng thứ hai", async () => {
    const linkId = await linkPartner(chain, partner, { code: "HN-01", status: "PENDING" })
    await acceptLink(withSession(`${BASE}/chain/links/${linkId}/accept`, partner.token, { method: "POST" }), params(linkId))

    const patch = (status: string) =>
      patchPartnerStatus(withSession(`${BASE}/coordinator/partners/${linkId}/status`, chain.token, { method: "PATCH", body: JSON.stringify({ status, reason: "Theo kế hoạch" }) }), params(linkId))
    expect((await patch("SUSPENDED")).status).toBe(200)
    expect(await candidates(chain)).toEqual([])
    expect((await patch("ACTIVE")).status).toBe(200)
    expect(await candidates(chain)).toEqual(["Tiệm hoa doitac"])
    expect(await prisma.branches.count({ where: { partner_org_id: partner.organizationId } })).toBe(1)

    // Chuỗi khác không đổi được liên kết (và không đụng ứng viên) của chuỗi này
    const stranger = await patchPartnerStatus(withSession(`${BASE}/coordinator/partners/${linkId}/status`, otherChain.token, { method: "PATCH", body: JSON.stringify({ status: "TERMINATED", reason: "Thử lén" }) }), params(linkId))
    expect(stranger.status).toBe(404)
    expect(await candidates(chain)).toEqual(["Tiệm hoa doitac"])
  })
})
