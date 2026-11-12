import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { PATCH as patchTools } from "@/app/api/v1/coordinator/partners/[id]/tools/route"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, linkPartner, makeChainOrganization, withSession, type Tenant } from "../helpers/fixtures"

/**
 * AUD-004: chuỗi mở khoá công cụ cho cửa hàng đối tác. Chỉ chuỗi sở hữu quan hệ đối tác được ghi,
 * chỉ khoá `unlocked_tools` thay đổi (các khoá settings khác giữ nguyên), mã công cụ lạ bị từ chối.
 */
describe("PATCH coordinator/partners/[id]/tools", () => {
  let chain: Tenant
  let partner: Tenant
  let outsider: Tenant
  let partnershipId: string

  const call = (tenant: Tenant, id: string, body: unknown) =>
    patchTools(
      withSession(`http://localhost/api/v1/coordinator/partners/${id}/tools`, tenant.token, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) }
    )

  beforeEach(async () => {
    await resetDatabase()
    chain = await createTenant("chain")
    partner = await createTenant("partner")
    outsider = await createTenant("outsider")
    await makeChainOrganization(chain)
    await makeChainOrganization(outsider)
    await prisma.organizations.update({
      where: { id: partner.organizationId },
      data: { settings: { industry: "FLORAL", brochure_discount: { max_percent: 10 } } },
    })
    partnershipId = await linkPartner(chain, partner, { code: "P-01" })
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("chuỗi sở hữu ghi được; các khoá settings khác giữ nguyên", async () => {
    const res = await call(chain, partnershipId, { unlocked_tools: ["catalog", "the-chao", "catalog"] })
    expect(res.status).toBe(200)
    const org = await prisma.organizations.findUniqueOrThrow({ where: { id: partner.organizationId } })
    expect(org.settings).toMatchObject({
      industry: "FLORAL",
      brochure_discount: { max_percent: 10 },
      unlocked_tools: ["catalog", "the-chao"],
    })
  })

  it("lưu [] (khoá hết) được giữ là mảng rỗng, không bị hiểu thành null", async () => {
    await call(chain, partnershipId, { unlocked_tools: [] })
    const org = await prisma.organizations.findUniqueOrThrow({ where: { id: partner.organizationId } })
    expect((org.settings as Record<string, unknown>).unlocked_tools).toEqual([])
  })

  it("chuỗi khác gọi vào quan hệ không phải của mình → 404, dữ liệu không đổi", async () => {
    const res = await call(outsider, partnershipId, { unlocked_tools: ["catalog"] })
    expect(res.status).toBe(404)
    const org = await prisma.organizations.findUniqueOrThrow({ where: { id: partner.organizationId } })
    expect((org.settings as Record<string, unknown>).unlocked_tools).toBeUndefined()
  })

  it("mã công cụ sai định dạng bị từ chối", async () => {
    const res = await call(chain, partnershipId, { unlocked_tools: ["<script>"] })
    expect(res.status).toBe(400)
  })
})
