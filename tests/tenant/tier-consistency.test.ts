import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as getMatrix } from "@/app/api/v1/organizations/current/governance-matrix/route"
import { GET as getHub } from "@/app/api/v1/integrations/route"
import { GET as getVideoJobs } from "@/app/api/v1/video/jobs/route"
import { GET as getCatalogLinks } from "@/app/api/v1/catalog-links/route"
import { PATCH as patchTools } from "@/app/api/v1/coordinator/partners/[id]/tools/route"
import { buildNav } from "@/components/layout/nav"
import { organizationTierOf, tierOf } from "@/core/governance/tier-of"
import { GovernanceRepository } from "@/modules/integration-hub/infra/governance-repository"
import { NotificationHardLockRepository } from "@/modules/notification/infra/notification-hard-lock-repository"
import { notifyOrganization } from "@/modules/notification/use-cases/notify-organization"
import { resolveEffectiveNotification } from "@/modules/notification/use-cases/resolve-effective-notification"
import { unlockedToolsFrom } from "@/modules/organization/domain/tool-route-entitlement"
import { saveMotherGovernance, saveOrgGovernance } from "@/modules/organization/infra/governance-decisions-repository"
import { resolveTierChain } from "@/modules/organization/infra/tier-chain-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, linkPartner, makeChainOrganization, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * P2-A11 — bộ test đối chiếu tầng (audit 13 §10 điều 7; kế hoạch `db-enterprise-architecture.md` GĐ2).
 *
 * Mỗi trục × Mẹ / Chuỗi / Cửa hàng, trên dữ liệu do luồng đăng ký thật sinh ra:
 * - mọi trục xác định tầng và chuỗi cha của một tổ chức GIỐNG NHAU (`resolveTierChain` là nguồn duy nhất);
 * - quyết định tầng Mẹ áp xuống cả chuỗi lẫn cửa hàng;
 * - quyết định của chuỗi chỉ áp xuống cửa hàng đối tác của nó, không chạm chính chuỗi hay cửa hàng ngoài chuỗi.
 *
 * Tầng Ngành không có cột ở đây: Ngành là plugin (D-01); trục ngành đã có `industries.test.ts`, `scope-keys.test.ts`.
 */
describe("đối chiếu tầng — mỗi trục × Mẹ / Chuỗi / Cửa hàng", () => {
  let chain: Tenant
  let partner: Tenant
  let solo: Tenant
  let linkId: string

  beforeEach(async () => {
    await resetDatabase() // dọn cả governance_decisions (ADR-012 D-T10)
    chain = await createTenant("chuoi")
    partner = await createTenant("cua-hang-doi-tac")
    solo = await createTenant("cua-hang-doc-lap")
    await makeChainOrganization(chain)
    linkId = await linkPartner(chain, partner, { code: "P-01" })
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  const all = () => [chain, partner, solo]
  const typeOf = async (t: Tenant) => (await prisma.organizations.findUniqueOrThrow({ where: { id: t.organizationId } })).type

  describe("danh tính tầng và chuỗi cha", () => {
    it("cây tổ chức: chuỗi là CHAIN; cửa hàng là STORE, chỉ cửa hàng đối tác có chuỗi cha", async () => {
      expect(await resolveTierChain(chain.organizationId)).toMatchObject({ tier: "CHAIN", primaryChain: null })
      expect(await resolveTierChain(partner.organizationId)).toMatchObject({
        tier: "STORE",
        primaryChain: { organizationId: chain.organizationId },
      })
      expect(await resolveTierChain(solo.organizationId)).toMatchObject({ tier: "STORE", primaryChain: null })
    })

    it("điều hướng, ma trận quản trị và khoá tích hợp cùng thấy một tầng và một chuỗi cha", async () => {
      const integration = new GovernanceRepository()
      for (const t of all()) {
        const tree = await resolveTierChain(t.organizationId)
        const type = await typeOf(t)
        expect(organizationTierOf(type)).toBe(tree?.tier)
        expect(tierOf(type, null)).toBe(tree?.tier) // tầng trải nghiệm (điều hướng) khi không xem trước tầng

        const matrix = (await readJson(await getMatrix(withSession(MATRIX_URL, t.token)))) as unknown as MatrixView
        expect(matrix.data.tier).toBe(tree?.tier)
        expect(matrix.data.upper.some((l) => l.tier === "CHAIN")).toBe(tree?.primaryChain !== null)

        expect((await integration.scopeOf(t.organizationId)).parentChainOrgId).toBe(tree?.primaryChain?.organizationId ?? null)
      }
    })

    it("liên kết bị tạm ngưng: mọi trục cùng coi cửa hàng là độc lập", async () => {
      await prisma.organization_links.update({ where: { id: linkId }, data: { status: "SUSPENDED", is_primary: false } })
      expect((await resolveTierChain(partner.organizationId))?.primaryChain).toBeNull()
      const matrix = (await readJson(await getMatrix(withSession(MATRIX_URL, partner.token)))) as unknown as MatrixView
      expect(matrix.data.upper.some((l) => l.tier === "CHAIN")).toBe(false)
      expect((await new GovernanceRepository().scopeOf(partner.organizationId)).parentChainOrgId).toBeNull()
    })
  })

  describe("ma trận quản trị", () => {
    const LOCK = { deposit_min: { enabled: true } }
    const locksAt = async (t: Tenant, tier: string) => {
      const view = (await readJson(await getMatrix(withSession(MATRIX_URL, t.token)))) as unknown as MatrixView
      // Tầng Mẹ có thể có hai lớp: khoá dựng sẵn (`withBuiltInLocks`) và khoá lưu ở `platform_settings`
      return Object.assign({}, ...view.data.upper.filter((l) => l.tier === tier).map((l) => l.decisions.locks)) as Record<string, unknown>
    }

    it("Mẹ khoá → chuỗi, cửa hàng đối tác và cửa hàng độc lập đều thấy khoá", async () => {
      await saveMotherGovernance("PAYMENTS", { overrides: {}, locks: LOCK }, null)
      for (const t of all()) expect(await locksAt(t, "MOTHER")).toMatchObject(LOCK)
    })

    it("Chuỗi khoá → chỉ cửa hàng đối tác thấy", async () => {
      // Ghi qua đường thật (ghi kép governance_decisions — nguồn đọc từ ADR-012 T-7b)
      expect(await saveOrgGovernance(chain.organizationId, "PAYMENTS", { overrides: {}, locks: LOCK }, chain.userId)).toBe(true)
      expect(await locksAt(partner, "CHAIN")).toEqual(LOCK)
      expect(await locksAt(solo, "CHAIN")).toEqual({})
      expect(await locksAt(chain, "CHAIN")).toEqual({})
    })
  })

  describe("khoá tích hợp", () => {
    const CONNECTOR = "facebook_messenger"
    const availability = async (t: Tenant) =>
      ((await readJson(await getHub(withSession(HUB_URL, t.token)))) as unknown as Hub).catalog.find((c) => c.key === CONNECTOR)?.availability

    it("Mẹ cấm → mọi tầng bị khoá", async () => {
      await new GovernanceRepository().set({ connectorKey: CONNECTOR, tier: "MOTHER", scopeId: "GLOBAL", mode: "FORBID", updatedBy: "test" })
      for (const t of all()) expect(await availability(t)).toBe("LOCKED_BY_UPPER")
    })

    it("Chuỗi cấm → chỉ cửa hàng đối tác bị khoá", async () => {
      await new GovernanceRepository().set({ connectorKey: CONNECTOR, tier: "CHAIN", scopeId: chain.organizationId, mode: "FORBID", updatedBy: "test" })
      expect(await availability(partner)).toBe("LOCKED_BY_UPPER")
      expect(await availability(solo)).not.toBe("LOCKED_BY_UPPER")
      expect(await availability(chain)).not.toBe("LOCKED_BY_UPPER")
    })
  })

  describe("khoá thông báo", () => {
    const EVENT = "ORDER_RECEIVED"
    const resolve = (t: Tenant) =>
      resolveEffectiveNotification({ eventKey: EVENT, channel: "APP_INBOX", userId: t.userId, roleKey: "store_admin", storeOrgId: t.organizationId })
    const lock = (tier: "MOTHER" | "CHAIN", scopeId: string) =>
      new NotificationHardLockRepository().setHardLock({ eventKey: EVENT, channel: "APP_INBOX", tier, scopeId, enabled: false, lockedBy: "test" })

    it("không khoá: mặc định Mẹ bật cho mọi tầng", async () => {
      for (const t of all()) expect(await resolve(t)).toMatchObject({ enabled: true, decidedBy: "MOTHER_DEFAULT" })
    })

    it("Mẹ khoá tắt → mọi tầng tắt, do khoá Mẹ quyết định", async () => {
      await lock("MOTHER", "GLOBAL")
      for (const t of all()) expect(await resolve(t)).toMatchObject({ enabled: false, decidedBy: "HARD_LOCK_MOTHER" })
    })

    it("Chuỗi khoá tắt → áp cho chính chuỗi, không lan sang cửa hàng ngoài chuỗi", async () => {
      await lock("CHAIN", chain.organizationId)
      expect(await resolve(chain)).toMatchObject({ enabled: false, decidedBy: "HARD_LOCK_CHAIN" })
      expect(await resolve(solo)).toMatchObject({ enabled: true })
    })

    it("đường gửi thật: khoá của chuỗi tắt thông báo ở cửa hàng đối tác, cửa hàng ngoài chuỗi vẫn nhận", async () => {
      const inboxOf = (t: Tenant) => prisma.notification_inbox.count({ where: { organization_id: t.organizationId, event_key: EVENT } })
      for (const t of [partner, solo]) expect(await notifyOrganization({ organizationId: t.organizationId, eventKey: EVENT })).toBeGreaterThan(0)
      expect(await inboxOf(partner)).toBeGreaterThan(0)

      await prisma.notification_inbox.deleteMany({})
      await lock("CHAIN", chain.organizationId)
      expect(await notifyOrganization({ organizationId: partner.organizationId, eventKey: EVENT })).toBe(0)
      expect(await inboxOf(partner)).toBe(0)
      expect(await notifyOrganization({ organizationId: solo.organizationId, eventKey: EVENT })).toBeGreaterThan(0)
    })
  })

  describe("khoá công cụ (chuỗi → cửa hàng đối tác)", () => {
    const visibleTools = async (t: Tenant) => {
      const org = await prisma.organizations.findUniqueOrThrow({ where: { id: t.organizationId } })
      const nav = buildNav(() => true, null, "FLORAL", null, org.type, unlockedToolsFrom(org.settings))
      return new Set(nav.groups.flatMap((g) => g.entries.map((e) => e.navKey)))
    }
    const status = async (t: Tenant) => ({
      video: (await getVideoJobs(withSession("http://localhost/api/v1/video/jobs", t.token))).status,
      catalog: (await getCatalogLinks(withSession("http://localhost/api/v1/catalog-links", t.token))).status,
    })

    it("chưa khoá: cửa hàng thấy công cụ trên menu; mọi tầng gọi được API của công cụ", async () => {
      for (const t of [partner, solo]) expect(await visibleTools(t)).toContain("video")
      for (const t of all()) expect((await status(t)).video).not.toBe(403)
    })

    it("Chuỗi chỉ mở Catalog → đối tác mất Video ở cả menu lẫn API; chuỗi và cửa hàng ngoài chuỗi không đổi", async () => {
      const res = await patchTools(
        withSession(`http://localhost/api/v1/coordinator/partners/${linkId}/tools`, chain.token, {
          method: "PATCH",
          body: JSON.stringify({ unlockedTools: ["catalog"] }),
        }),
        { params: Promise.resolve({ id: linkId }) },
      )
      expect(res.status).toBe(200)

      const tools = await visibleTools(partner)
      expect(tools).not.toContain("video")
      expect(tools).toContain("catalog")
      const s = await status(partner)
      expect(s.video).toBe(403)
      expect(s.catalog).not.toBe(403)

      for (const t of [chain, solo]) {
        expect((await status(t)).video).not.toBe(403)
      }
      expect(await visibleTools(solo)).toContain("video")
    })
  })
})

const MATRIX_URL = "http://localhost/api/v1/organizations/current/governance-matrix?system=PAYMENTS"
const HUB_URL = "http://localhost/api/v1/integrations"
type MatrixView = { data: { tier: string; upper: { tier: string; decisions: { locks: Record<string, unknown> } }[] } }
type Hub = { catalog: Array<{ key: string; availability: string }> }
