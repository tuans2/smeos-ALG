import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { findPrimaryChainLink, resolveTierChain } from "@/modules/organization/infra/tier-chain-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, linkPartner, makeChainOrganization, type Tenant } from "../helpers/fixtures"

/**
 * ADR-012 T-1: một hàm đọc cây tổ chức thay 4 bản tự truy vấn `chain_partnerships`.
 * Luật giữ nguyên hành vi cũ: chuỗi cha = liên kết ACTIVE sớm nhất (T-3a: cạnh `is_primary` của `organization_links`).
 */
describe("resolveTierChain — chuỗi cha của một cửa hàng đối tác", () => {
  let chainA: Tenant
  let chainB: Tenant
  let store: Tenant

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

  async function link(chain: Tenant, code: string, createdAt: Date, status: "ACTIVE" | "SUSPENDED" = "ACTIVE") {
    await linkPartner(chain, store, { code, status, createdAt })
  }

  it("cửa hàng không liên kết: tầng STORE, không có chuỗi cha", async () => {
    const chain = await resolveTierChain(store.organizationId)
    expect(chain).toMatchObject({ tier: "STORE", primaryChain: null })
  })

  it("tổ chức chuỗi: tầng CHAIN", async () => {
    expect((await resolveTierChain(chainA.organizationId))?.tier).toBe("CHAIN")
  })

  it("thuộc hai chuỗi: chọn liên kết ACTIVE sớm nhất", async () => {
    await link(chainB, "B-01", new Date("2026-02-01T00:00:00Z"))
    await link(chainA, "A-01", new Date("2026-01-01T00:00:00Z"))
    const primary = await findPrimaryChainLink(store.organizationId)
    expect(primary?.chainOrgId).toBe(chainA.organizationId)
    expect((await resolveTierChain(store.organizationId))?.primaryChain?.organizationId).toBe(chainA.organizationId)
  })

  it("liên kết không ACTIVE bị bỏ qua", async () => {
    await link(chainA, "A-01", new Date("2026-01-01T00:00:00Z"), "SUSPENDED")
    await link(chainB, "B-01", new Date("2026-02-01T00:00:00Z"))
    expect((await findPrimaryChainLink(store.organizationId))?.chainOrgId).toBe(chainB.organizationId)
  })

  it("đọc khoá ngành từ cột industry_key; settings.industry sót lại không có tác dụng (T-6c-2)", async () => {
    await prisma.organizations.update({ where: { id: store.organizationId }, data: { industry_key: "HOMESTAY", settings: { industry: "flower" } } })
    expect((await resolveTierChain(store.organizationId))?.industryKey).toBe("HOMESTAY")
  })

  it("tổ chức không tồn tại: null", async () => {
    expect(await resolveTierChain("khong-ton-tai")).toBeNull()
  })
})
