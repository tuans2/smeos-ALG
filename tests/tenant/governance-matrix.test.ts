import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET, PUT } from "@/app/api/v1/organizations/current/governance-matrix/route"
import { loadPolicyGovernance } from "@/modules/organization/use-cases/governance-matrix"
import { resolveAppliedPolicies } from "@/modules/greeting-card/domain/store-policy"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, linkPartner, makeChainOrganization, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Ma trận quản trị: mỗi tổ chức chỉ ghi được quyết định của chính mình; cửa hàng đối tác thấy khoá
 * của chuỗi và không ghi đè được mục chuỗi đã khoá; tổ chức ngoài chuỗi không bị ảnh hưởng.
 */
describe("organizations/current/governance-matrix", () => {
  let chain: Tenant
  let store: Tenant
  let outsider: Tenant
  const URL_ = "http://localhost/api/v1/organizations/current/governance-matrix?system=PAYMENTS"

  const put = (t: Tenant, decisions: unknown) => PUT(withSession(URL_, t.token, { method: "PUT", body: JSON.stringify({ decisions }) }))
  type View = { data: { tier: string; upper: { tier: string; decisions: { locks: Record<string, unknown> } }[] } }
  const get = async (t: Tenant) => (await readJson(await GET(withSession(URL_, t.token)))) as unknown as View

  beforeEach(async () => {
    await resetDatabase()
    chain = await createTenant("chain")
    store = await createTenant("store")
    outsider = await createTenant("outsider")
    await makeChainOrganization(chain)
    await prisma.organizations.update({ where: { id: store.organizationId }, data: { settings: { industry: "FLORAL" } } })
    await linkPartner(chain, store, { code: "P-01" })
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("chuỗi khoá → cửa hàng đối tác thấy khoá, tổ chức ngoài chuỗi không thấy", async () => {
    expect((await put(chain, { overrides: {}, locks: { deposit_min: { enabled: true } } })).status).toBe(200)
    const s = await get(store)
    expect(s.data.tier).toBe("STORE")
    expect(s.data.upper.find((l) => l.tier === "CHAIN")?.decisions.locks).toEqual({ deposit_min: { enabled: true } })
    const o = await get(outsider)
    expect(o.data.upper.some((l) => l.tier === "CHAIN")).toBe(false)
  })

  it("cửa hàng không ghi đè được mục chuỗi đã khoá và không tự đặt khoá", async () => {
    await put(chain, { overrides: {}, locks: { deposit_min: { enabled: true } } })
    expect((await put(store, { overrides: { deposit_min: false }, locks: {} })).status).toBe(422)
    expect((await put(store, { overrides: {}, locks: { x: { enabled: true } } })).status).toBe(422)
    expect((await put(store, { overrides: { vietqr: false }, locks: {} })).status).toBe(200)
  })

  it("chỉ ghi quyết định của chính tổ chức vào governance_decisions; settings không đổi (ADR-012 T-7c)", async () => {
    const before = await prisma.organizations.findUniqueOrThrow({ where: { id: store.organizationId } })
    await put(store, { overrides: { vietqr: false }, locks: {} })
    const org = await prisma.organizations.findUniqueOrThrow({ where: { id: store.organizationId } })
    expect(org.settings).toEqual(before.settings)
    const rows = await prisma.governance_decisions.findMany({ where: { system: "matrix:PAYMENTS" } })
    expect(rows.map((r) => [r.scope, r.decision_key, r.value])).toEqual([[`org:${store.organizationId}`, "vietqr", { enabled: false }]])
    expect(await prisma.governance_decisions.count({ where: { scope: `org:${outsider.organizationId}` } })).toBe(0)
  })

  it("sai loại ma trận → 400", async () => {
    const res = await GET(withSession("http://localhost/api/v1/organizations/current/governance-matrix?system=X", store.token))
    expect(res.status).toBe(400)
  })

  it("luồng bán hàng: ưu đãi chuỗi khoá tắt biến khỏi trang khách của cửa hàng đối tác, không ảnh hưởng tiệm ngoài", async () => {
    const PROMO = "http://localhost/api/v1/organizations/current/governance-matrix?system=PROMOTIONS"
    const lock = await PUT(withSession(PROMO, chain.token, { method: "PUT", body: JSON.stringify({ decisions: { overrides: {}, locks: { "promo-free-card": { enabled: false } } } }) }))
    expect(lock.status).toBe(200)
    const settings = { industry: "FLORAL" }
    const forStore = resolveAppliedPolicies(null, settings, "FLORAL", await loadPolicyGovernance(store.organizationId))
    const forOutsider = resolveAppliedPolicies(null, settings, "FLORAL", await loadPolicyGovernance(outsider.organizationId))
    expect(forStore.promotions.map((p) => p.id)).not.toContain("promo-free-card")
    expect(forOutsider.promotions.map((p) => p.id)).toContain("promo-free-card")
  })
})
