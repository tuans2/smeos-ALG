import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { PUT as putMatrix } from "@/app/api/v1/organizations/current/governance-matrix/route"
import { PATCH as patchOrganization } from "@/app/api/v1/organizations/current/route"
import { PUT as putIntegration } from "@/app/api/v1/integrations/governance/route"
import { DELETE as deleteOrgLock, POST as postOrgLock } from "@/app/api/v1/notification/org-hard-locks/route"
import { currentDecisions } from "@/core/governance/infra/decision-log"
import { NotificationPreferenceRepository } from "@/modules/notification/infra/notification-preference-repository"
import { saveMotherGovernance } from "@/modules/organization/infra/governance-decisions-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, linkPartner, makeChainOrganization, withSession, type Tenant } from "../helpers/fixtures"

/**
 * ADR-012 D-T10: `governance_decisions` là nơi lưu DUY NHẤT của quyết định theo tầng (T-7c đã bỏ nơi lưu cũ).
 * Đường ghi qua route thật: mỗi thay đổi là một dòng, bỏ mục thành dòng gỡ (ghi người gỡ), lưu lại đúng tập cũ không
 * thêm dòng, bị từ chối thì không để lại dòng nào.
 */
describe("governance_decisions — đường ghi", () => {
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

  const matrixUrl = "http://localhost/api/v1/organizations/current/governance-matrix?system=PAYMENTS"
  const saveMatrix = (t: Tenant, decisions: unknown) =>
    putMatrix(withSession(matrixUrl, t.token, { method: "PUT", body: JSON.stringify({ decisions }) }))
  const history = (where: { system?: string; scope?: string; decision_key?: string }) =>
    prisma.governance_decisions.findMany({ where, orderBy: { version: "asc" } })

  it("ma trận của chuỗi, của cửa hàng và của Mẹ: ghi, đổi, bỏ mục — mục bỏ thành dòng gỡ có người gỡ", async () => {
    expect((await saveMatrix(chain, { overrides: { vietqr: false }, locks: { deposit_min: { enabled: true } } })).status).toBe(200)
    expect((await saveMatrix(store, { overrides: { cod: true }, locks: {} })).status).toBe(200)
    await saveMotherGovernance("PAYMENTS", { overrides: {}, locks: { bank_transfer: { enabled: true } } }, null)
    const current = await currentDecisions(prisma, { systems: ["matrix:PAYMENTS"] })
    expect(current.map((d) => [d.tier, d.scope, d.decisionKey, d.locked]).sort()).toEqual([
      ["CHAIN", `org:${chain.organizationId}`, "deposit_min", true],
      ["CHAIN", `org:${chain.organizationId}`, "vietqr", false],
      ["MOTHER", "platform", "bank_transfer", true],
      ["STORE", `org:${store.organizationId}`, "cod", false],
    ])

    expect((await saveMatrix(chain, { overrides: { vietqr: true }, locks: {} })).status).toBe(200)
    const removed = await history({ scope: `org:${chain.organizationId}`, decision_key: "deposit_min" })
    expect(removed.map((r) => r.value)).toEqual([{ enabled: true }, null])
    expect(removed[1]?.decided_by).toBe(chain.userId)

    const before = await prisma.governance_decisions.count()
    await saveMatrix(chain, { overrides: { vietqr: true }, locks: {} })
    expect(await prisma.governance_decisions.count()).toBe(before)
  })

  it("ma trận bị cấp trên từ chối (422) không để lại dòng nào", async () => {
    await saveMatrix(chain, { overrides: {}, locks: { deposit_min: { enabled: true } } })
    const before = await prisma.governance_decisions.count()
    expect((await saveMatrix(store, { overrides: { deposit_min: false }, locks: {} })).status).toBe(422)
    expect(await prisma.governance_decisions.count()).toBe(before)
  })

  it("PATCH settings không ghi được governance_matrix (403), không thêm quyết định", async () => {
    const res = await patchOrganization(
      withSession("http://localhost/api/v1/organizations/current", store.token, {
        method: "PATCH",
        body: JSON.stringify({ settings: { governance_matrix: { PAYMENTS: { overrides: { deposit_min: false }, locks: {} } } } }),
      }),
    )
    expect(res.status).toBe(403)
    expect(await prisma.governance_decisions.count()).toBe(0)
  })

  it("khoá cứng thông báo của chuỗi: đặt, đổi, gỡ — dòng gỡ ghi người gỡ", async () => {
    const url = "http://localhost/api/v1/notification/org-hard-locks"
    const send = (method: string, body: unknown) => withSession(url, chain.token, { method, body: JSON.stringify(body) })
    expect((await postOrgLock(send("POST", { eventKey: "ORDER_RECEIVED", channel: "EMAIL", enabled: false, reason: "Bảo trì" }))).status).toBe(200)
    expect((await postOrgLock(send("POST", { eventKey: "ORDER_RECEIVED", channel: "EMAIL", enabled: true }))).status).toBe(200)
    expect((await deleteOrgLock(send("DELETE", { eventKey: "ORDER_RECEIVED", channel: "EMAIL" }))).status).toBe(200)
    const rows = await history({ system: "notification.hard_lock" })
    expect(rows.map((r) => r.value)).toEqual([{ enabled: false, reason: "Bảo trì" }, { enabled: true, reason: null }, null])
    expect(rows[2]).toMatchObject({ scope: `org:${chain.organizationId}`, tier: "CHAIN", decided_by: chain.userId })
  })

  it("hiển thị sự kiện theo tầng (quyết định của Mẹ): mỗi lần đổi một dòng", async () => {
    const repo = new NotificationPreferenceRepository()
    await repo.setEventVisibility("ORDER_RECEIVED", "STORE", false, "op-1")
    await repo.setEventVisibility("ORDER_RECEIVED", "STORE", false, "op-1") // không đổi → không thêm dòng
    await repo.setEventVisibility("ORDER_RECEIVED", "STORE", true, "op-1")
    expect((await history({ system: "notification.visibility" })).map((r) => r.value)).toEqual([{ visible: false }, { visible: true }])
  })

  it("khoá tích hợp của chuỗi: FORBID → INHERIT_ONLY → ALLOW_OWN (gỡ)", async () => {
    const put = (mode: string) =>
      putIntegration(withSession("http://localhost/api/v1/integrations/governance", chain.token, {
        method: "PUT",
        body: JSON.stringify({ connectorKey: "zalo_oa", mode }),
      }))
    for (const mode of ["FORBID", "INHERIT_ONLY", "ALLOW_OWN"]) expect((await put(mode)).status).toBe(200)
    expect((await history({ system: "integration" })).map((r) => r.value)).toEqual([{ mode: "FORBID" }, { mode: "INHERIT_ONLY" }, null])
  })
})
