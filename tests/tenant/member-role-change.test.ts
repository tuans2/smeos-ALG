import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as me } from "@/app/api/v1/auth/me/route"
import { PATCH as rolePatch } from "@/app/api/v1/members/[id]/role/route"
import { prisma } from "@/core/tenancy/infra/prisma"
import { RoleRepository } from "@/modules/organization/infra/role-repository"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/** Checklist ALG 1.11 — đổi vai có hiệu lực ngay, ghi nhật ký, không tự đổi vai, cách ly tổ chức. */

const url = (path: string) => `http://localhost/api/v1${path}`
const params = (id: string) => ({ params: Promise.resolve({ id }) })
const patch = (token: string, membershipId: string, roleId: string) =>
  rolePatch(withSession(url(`/members/${membershipId}/role`), token, { method: "PATCH", body: JSON.stringify({ role_id: roleId }) }), params(membershipId))

async function capabilitiesOf(token: string): Promise<string[]> {
  const res = await me(withSession(url("/auth/me"), token))
  expect(res.status).toBe(200)
  const body = (await readJson(res)) as { capabilities?: string[]; data?: { capabilities?: string[] } }
  return body.capabilities ?? body.data?.capabilities ?? []
}

async function membershipOf(tenant: Tenant, userId: string) {
  return prisma.memberships.findFirstOrThrow({ where: { organization_id: tenant.organizationId, user_id: userId } })
}

describe("đổi vai thành viên (1.11)", () => {
  let a: Tenant
  let b: Tenant
  let coordinatorRoleId: string

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    coordinatorRoleId = (await new RoleRepository().findSystemRoleByKey("dieu_phoi"))!.id
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("Sale đổi sang Điều phối: quyền mới có hiệu lực ngay ở phiên đang mở, có nhật ký vai trước/sau", async () => {
    const sale = await addStaffWithSession(a, "sale", "lan")
    const membership = await membershipOf(a, sale.userId)
    expect(await capabilitiesOf(sale.token)).not.toContain("R4")

    const res = await patch(a.token, membership.id, coordinatorRoleId)
    expect(res.status).toBe(200)

    expect(await capabilitiesOf(sale.token)).toContain("R4")
    const log = await prisma.audit_logs.findFirst({
      where: { organization_id: a.organizationId, action: "member.role.change", entity_id: membership.id },
    })
    expect(log?.before).toMatchObject({ roleId: membership.role_id })
    expect(log?.after).toMatchObject({ roleId: coordinatorRoleId, roleKey: "dieu_phoi" })
  })

  it("không tự đổi vai của chính mình (422), vai giữ nguyên", async () => {
    const own = await membershipOf(a, a.userId)
    const res = await patch(a.token, own.id, coordinatorRoleId)
    expect(res.status).toBe(422)
    expect((await membershipOf(a, a.userId)).role_id).toBe(own.role_id)
  })

  it("Điều hành tổ chức khác đổi vai → 404; Sale đổi vai người khác → 403", async () => {
    const sale = await addStaffWithSession(a, "sale", "lan")
    const membership = await membershipOf(a, sale.userId)

    expect((await patch(b.token, membership.id, coordinatorRoleId)).status).toBe(404)

    const otherSale = await addStaffWithSession(a, "sale", "minh")
    expect((await patch(otherSale.token, membership.id, coordinatorRoleId)).status).toBe(403)
    expect((await membershipOf(a, sale.userId)).role_id).toBe(membership.role_id)
  })
})
