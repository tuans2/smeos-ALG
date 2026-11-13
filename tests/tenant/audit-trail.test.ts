import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as listAuditLogs } from "@/app/api/v1/audit-logs/route"
import { PATCH as rolePatch } from "@/app/api/v1/members/[id]/role/route"
import { POST as createOccasion } from "@/app/api/v1/occasions/route"
import { resetDeniedAuditWindow } from "@/core/http/request-audit"
import { RoleRepository } from "@/modules/organization/infra/role-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/** Checklist ALG 1.15 (ghi lần vượt quyền) và 1.17 (nhật ký mọi thao tác kèm IP/thiết bị, lọc phía máy chủ). */

const BASE = "http://localhost/api/v1"
const DEVICE = { "x-forwarded-for": "203.0.113.7", "user-agent": "Mozilla/5.0 (iPhone) Thu-nghiem" }
const params = (id: string) => ({ params: Promise.resolve({ id }) })

describe("nhật ký thao tác và lần vượt quyền", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    resetDeniedAuditWindow()
    a = await createTenant("alpha")
    b = await createTenant("beta")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("thao tác ghi thành công có dòng nhật ký kèm IP và thiết bị", async () => {
    const res = await createOccasion(
      withSession(`${BASE}/occasions`, a.token, { method: "POST", headers: DEVICE, body: JSON.stringify({ code: "tet", name: "Tết" }) })
    )
    expect(res.status).toBe(201)

    const row = await prisma.audit_logs.findFirstOrThrow({ where: { organization_id: a.organizationId, action: "api.mutation" } })
    expect(row).toMatchObject({ user_id: a.userId, entity_id: "/api/v1/occasions", ip: "203.0.113.7", user_agent: DEVICE["user-agent"] })
  })

  it("nhật ký nghiệp vụ (đổi vai) tự nhận IP và thiết bị của yêu cầu", async () => {
    const sale = await addStaffWithSession(a, "sale", "lan")
    const membership = await prisma.memberships.findFirstOrThrow({ where: { organization_id: a.organizationId, user_id: sale.userId } })
    const roleId = (await new RoleRepository().findSystemRoleByKey("dieu_phoi"))!.id
    const res = await rolePatch(
      withSession(`${BASE}/members/${membership.id}/role`, a.token, { method: "PATCH", headers: DEVICE, body: JSON.stringify({ role_id: roleId }) }),
      params(membership.id)
    )
    expect(res.status).toBe(200)
    const row = await prisma.audit_logs.findFirstOrThrow({ where: { organization_id: a.organizationId, action: "member.role.change" } })
    expect(row).toMatchObject({ ip: "203.0.113.7", user_agent: DEVICE["user-agent"] })
  })

  it("Sale cố đổi vai người khác → 403 và đúng một dòng ghi lần vượt quyền trong một phút", async () => {
    const sale = await addStaffWithSession(a, "sale", "lan")
    const own = await prisma.memberships.findFirstOrThrow({ where: { organization_id: a.organizationId, user_id: a.userId } })
    const attempt = () =>
      rolePatch(
        withSession(`${BASE}/members/${own.id}/role`, sale.token, { method: "PATCH", headers: DEVICE, body: JSON.stringify({ role_id: "x" }) }),
        params(own.id)
      )
    expect((await attempt()).status).toBe(403)
    expect((await attempt()).status).toBe(403)

    const rows = await prisma.audit_logs.findMany({ where: { organization_id: a.organizationId, action: "security.access_denied" } })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ user_id: sale.userId, ip: "203.0.113.7", entity_id: `/api/v1/members/${own.id}/role` })
    expect(rows[0]!.after).toMatchObject({ method: "PATCH", capability: "F5" })
  })

  it("API nhật ký lọc phía máy chủ theo loại thao tác và ngày; tổ chức khác không thấy", async () => {
    await createOccasion(withSession(`${BASE}/occasions`, a.token, { method: "POST", body: JSON.stringify({ code: "tet", name: "Tết" }) }))
    const sale = await addStaffWithSession(a, "sale", "lan")
    await createOccasion(withSession(`${BASE}/occasions`, sale.token, { method: "POST", body: JSON.stringify({ code: "x", name: "X" }) }))

    const today = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10)
    const read = async (token: string, query: string) =>
      ((await readJson(await listAuditLogs(withSession(`${BASE}/audit-logs?${query}`, token)))).data as { action: string }[])

    const denied = await read(a.token, `action=security.&from=${today}&to=${today}`)
    expect(denied.length).toBe(1)
    expect(denied.every((r) => r.action === "security.access_denied")).toBe(true)
    expect((await read(a.token, "action=api.mutation")).length).toBeGreaterThanOrEqual(1)
    expect(await read(a.token, "from=2000-01-01&to=2000-01-02")).toEqual([])
    expect(await read(b.token, "action=security.")).toEqual([])

    const bad = await listAuditLogs(withSession(`${BASE}/audit-logs?from=03-11-2026`, a.token))
    expect(bad.status).toBe(400)
  })
})
