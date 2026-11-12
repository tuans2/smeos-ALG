import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as linkExisting } from "@/app/api/v1/coordinator/partners/link-existing/route"
import { isActivePartnerTarget } from "@/modules/chain-partnership/infra/partner-link-guard"
import { PrismaChainPartnershipRepository } from "@/modules/chain-partnership/infra/prisma-partnership-repository"
import { resolveTierChain } from "@/modules/organization/infra/tier-chain-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, makeChainOrganization, withSession, type Tenant } from "../helpers/fixtures"

/**
 * ADR-012 D-T3: repository đối tác ghi thẳng `organization_links` (T-3b) và mọi đường đọc dùng bảng này (T-3a);
 * cạnh chính = liên kết chuỗi ACTIVE sớm nhất của cửa hàng, tối đa một cạnh chính.
 */
describe("organization_links — quan hệ chuỗi → cửa hàng đối tác", () => {
  let chainA: Tenant
  let chainB: Tenant
  let store: Tenant
  const repo = new PrismaChainPartnershipRepository()

  beforeEach(async () => {
    await resetDatabase()
    chainA = await createTenant("chuoi-a")
    chainB = await createTenant("chuoi-b")
    store = await createTenant("cua-hang")
    await makeChainOrganization(chainA)
    await makeChainOrganization(chainB)
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  const link = (chain: Tenant, code: string, type?: string) =>
    repo.linkExistingStore({ chainOrgId: chain.organizationId, partnerOrgId: store.organizationId, partnerCode: code, partnershipType: type })

  const links = () =>
    prisma.organization_links.findMany({ where: { child_org_id: store.organizationId }, orderBy: { created_at: "asc" } })

  it("mỗi liên kết là một dòng organization_links, đúng loại, là cạnh chính", async () => {
    const b = await link(chainB, "B-01", "FRANCHISE")
    const rows = await links()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ id: b.id, parent_org_id: chainB.organizationId, link_type: "FRANCHISE", status: "ACTIVE", is_primary: true })
  })

  it("cửa hàng thuộc hai chuỗi: cạnh chính là liên kết ACTIVE sớm nhất; tạm ngưng thì chuyển sang chuỗi còn lại", async () => {
    const b = await link(chainB, "B-01")
    const a = await link(chainA, "A-01")
    const primaryOf = async () => (await links()).filter((r) => r.is_primary).map((r) => r.id)

    expect(await primaryOf()).toEqual([b.id])

    await repo.updateStatus(b.id, "SUSPENDED")
    expect(await primaryOf()).toEqual([a.id])
    expect((await prisma.organization_links.findUniqueOrThrow({ where: { id: b.id } })).status).toBe("SUSPENDED")

    await repo.updateStatus(a.id, "TERMINATED")
    expect(await primaryOf()).toEqual([])
    expect((await prisma.organization_links.findUniqueOrThrow({ where: { id: a.id } })).valid_to).not.toBeNull()
  })

  it("liên kết lại (upsert) không tạo dòng mới", async () => {
    await link(chainA, "A-01")
    await link(chainA, "A-02")
    const rows = await links()
    expect(rows).toHaveLength(1)
    expect(rows[0]?.partner_code).toBe("A-02")
  })

  it("chấm dứt rồi liên kết lại: cùng dòng, ACTIVE trở lại, hết hạn được xoá, lại là cạnh chính", async () => {
    const a = await link(chainA, "A-01")
    await repo.updateStatus(a.id, "TERMINATED")
    const again = await link(chainA, "A-03", "FRANCHISE")
    expect(again.id).toBe(a.id)
    const row = await prisma.organization_links.findUniqueOrThrow({ where: { id: a.id } })
    expect(row).toMatchObject({ status: "ACTIVE", valid_to: null, is_primary: true, link_type: "FRANCHISE", partner_code: "A-03" })
  })

  // ── T-3a: mọi đường đọc ở organization_links ──────────────────────────────
  it("danh sách, chi tiết và giá trị trả về của ghi đọc từ organization_links", async () => {
    const b = await link(chainB, "B-01", "FRANCHISE")
    expect(b).toMatchObject({ chainOrgId: chainB.organizationId, partnerOrgId: store.organizationId, partnershipType: "FRANCHISE", status: "ACTIVE" })
    expect(b.partnerOrgName).toBeTruthy()

    await prisma.organization_links.update({ where: { id: b.id }, data: { partner_code: "B-99" } })
    const { items, total } = await repo.listPartnerships({ chainOrgId: chainB.organizationId })
    expect(total).toBe(1)
    expect(items[0]).toMatchObject({ id: b.id, partnerCode: "B-99", partnerOrgSlug: expect.any(String) })
    expect((await repo.findPartnershipById(b.id))?.partnerCode).toBe("B-99")
  })

  it("cạnh không phải quan hệ chuỗi (tầng Ngành) không hiện là đối tác, chuỗi cha hay đích đẩy đơn", async () => {
    await prisma.organization_links.create({
      data: { parent_org_id: chainA.organizationId, child_org_id: store.organizationId, link_type: "INDUSTRY_MEMBER", partner_code: "N-01" },
    })
    expect((await repo.listPartnerships({ chainOrgId: chainA.organizationId })).total).toBe(0)
    expect((await resolveTierChain(store.organizationId))?.primaryChain).toBeNull()
    expect(await isActivePartnerTarget(chainA.organizationId, store.organizationId)).toBe(false)

    await link(chainB, "B-01")
    expect((await resolveTierChain(store.organizationId))?.primaryChain?.organizationId).toBe(chainB.organizationId)
    expect(await isActivePartnerTarget(chainB.organizationId, store.organizationId)).toBe(true)
  })

  it("loại BRANCH bị từ chối (ADR-012 D-T2) — không tạo liên kết", async () => {
    const res = await linkExisting(withSession("http://localhost/api/v1/coordinator/partners/link-existing", chainA.token, {
      method: "POST",
      body: JSON.stringify({ identifier: store.organizationId, partner_code: "A-01", partnership_type: "BRANCH" }),
    }))
    expect(res.status).toBe(400)
    expect(await links()).toHaveLength(0)
  })
})
