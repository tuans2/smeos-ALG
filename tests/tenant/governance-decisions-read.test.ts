import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as getMatrix } from "@/app/api/v1/organizations/current/governance-matrix/route"
import { GET as getHub } from "@/app/api/v1/integrations/route"
import { integrationRecord, matrixRecords, notificationLockRecord, notificationVisibilityRecord } from "@/core/governance/decision-record"
import { recordDecisions } from "@/core/governance/infra/decision-log"
import { NotificationPreferenceRepository } from "@/modules/notification/infra/notification-preference-repository"
import { resolveEffectiveNotification } from "@/modules/notification/use-cases/resolve-effective-notification"
import { loadPolicyGovernance } from "@/modules/organization/use-cases/governance-matrix"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, linkPartner, makeChainOrganization, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * ADR-012 D-T10: ma trận quản trị, khoá cứng + hiển thị thông báo, khoá tích hợp ĐỌC từ `governance_decisions` (T-7b);
 * mỗi trục một ca: quyết định ghi vào bảng có tác dụng ở route/use-case thật. `settings.governance_matrix` sót lại trong
 * JSON (T-7c đã xoá) không có tác dụng.
 */
describe("governance_decisions — nguồn đọc duy nhất", () => {
  let chain: Tenant
  let store: Tenant

  beforeEach(async () => {
    await resetDatabase()
    chain = await createTenant("chuoi")
    store = await createTenant("cua-hang")
    await makeChainOrganization(chain)
    await linkPartner(chain, store, { code: "P-01" })
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  type MatrixView = { data: { own: { overrides: Record<string, boolean> }; upper: { tier: string; decisions: { locks: Record<string, unknown> } }[] } }
  const matrixOf = async (t: Tenant) =>
    (await readJson(await getMatrix(withSession("http://localhost/api/v1/organizations/current/governance-matrix?system=PAYMENTS", t.token)))) as unknown as MatrixView

  it("ma trận: khoá của chuỗi và ghi đè của tiệm đọc từ bảng mới; settings.governance_matrix ghi thẳng bị bỏ qua", async () => {
    await recordDecisions(prisma, [
      ...matrixRecords({ system: "PAYMENTS", tier: "CHAIN", scope: `org:${chain.organizationId}`, decisions: { overrides: {}, locks: { deposit_min: { enabled: true } } }, decidedBy: null }),
      ...matrixRecords({ system: "PAYMENTS", tier: "STORE", scope: `org:${store.organizationId}`, decisions: { overrides: { vietqr: false }, locks: {} }, decidedBy: null }),
    ])
    await prisma.organizations.update({
      where: { id: chain.organizationId },
      data: { settings: { governance_matrix: { PAYMENTS: { overrides: {}, locks: { only_legacy: { enabled: true } } } } } },
    })
    const view = await matrixOf(store)
    expect(view.data.own.overrides).toEqual({ vietqr: false })
    expect(view.data.upper.find((l) => l.tier === "CHAIN")?.decisions.locks).toEqual({ deposit_min: { enabled: true } })
  })

  it("Thẻ chào: quyết định riêng của tiệm (`own`) và khoá chuỗi cho luồng bán hàng đến từ bảng mới", async () => {
    await recordDecisions(prisma, [
      ...matrixRecords({ system: "PROMOTIONS", tier: "STORE", scope: `org:${store.organizationId}`, decisions: { overrides: { "promo-gift": false }, locks: {} }, decidedBy: null }),
      ...matrixRecords({ system: "PROMOTIONS", tier: "CHAIN", scope: `org:${chain.organizationId}`, decisions: { overrides: {}, locks: { "promo-free-card": { enabled: false } } }, decidedBy: null }),
    ])
    await prisma.organizations.update({
      where: { id: store.organizationId },
      data: { settings: { governance_matrix: { PROMOTIONS: { overrides: { only_legacy: false }, locks: {} } } } },
    })
    const gov = await loadPolicyGovernance(store.organizationId)
    expect(gov.own?.PROMOTIONS).toEqual({ overrides: { "promo-gift": false }, locks: {} })
    expect(gov.PROMOTIONS?.find((l) => l.tier === "CHAIN")?.decisions.locks).toEqual({ "promo-free-card": { enabled: false } })
  })

  it("khoá cứng và hiển thị thông báo đọc từ bảng", async () => {
    const resolve = () =>
      resolveEffectiveNotification({ eventKey: "ORDER_RECEIVED", channel: "APP_INBOX", userId: store.userId, roleKey: "store_admin", storeOrgId: store.organizationId })
    expect(await resolve()).toMatchObject({ enabled: true })

    await recordDecisions(prisma, [notificationLockRecord({ eventKey: "ORDER_RECEIVED", channel: "APP_INBOX", tier: "MOTHER", scopeId: "GLOBAL", enabled: false, decidedBy: null })])
    expect(await resolve()).toMatchObject({ enabled: false, decidedBy: "HARD_LOCK_MOTHER" })

    await recordDecisions(prisma, [notificationVisibilityRecord({ eventKey: "ORDER_RECEIVED", targetTier: "STORE", visible: false, decidedBy: null })])
    expect((await new NotificationPreferenceRepository().getEventVisibilityMap())["ORDER_RECEIVED"]).toEqual({ INDUSTRY: true, CHAIN: true, STORE: false })
  })

  it("khoá tích hợp đọc từ bảng", async () => {
    const availability = async () =>
      ((await readJson(await getHub(withSession("http://localhost/api/v1/integrations", store.token)))) as { catalog: Array<{ key: string; availability: string }> })
        .catalog.find((c) => c.key === "facebook_messenger")?.availability
    expect(await availability()).not.toBe("LOCKED_BY_UPPER")

    await recordDecisions(prisma, [integrationRecord({ connectorKey: "facebook_messenger", tier: "CHAIN", scopeId: chain.organizationId, mode: "FORBID", decidedBy: null })])
    expect(await availability()).toBe("LOCKED_BY_UPPER")
  })
})
