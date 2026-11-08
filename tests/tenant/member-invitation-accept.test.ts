import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as invite } from "@/app/api/v1/members/invite/route"
import { GET as listInvitations } from "@/app/api/v1/session/invitations/route"
import { POST as accept } from "@/app/api/v1/session/invitations/[id]/accept/route"
import { POST as decline } from "@/app/api/v1/session/invitations/[id]/decline/route"
import { POST as switchOrg } from "@/app/api/v1/session/organization/route"
import { RoleRepository } from "@/modules/organization/infra/role-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * UJ-14 (audit hành trình 06/11/2026, M1 — UQ3: giữ hai đường thêm người): người ĐÃ có tài khoản được mời vào
 * tổ chức khác thấy lời mời, nhận/từ chối được, nhận xong chuyển sang tổ chức đó được. Trước đây thành viên
 * `INVITED` không có bước nào để thành `ACTIVE`.
 */
describe("nhận lời mời vào tổ chức", () => {
  let shop: Tenant
  let staff: Tenant
  let roleId: string

  const call = (handler: (r: Request, c: { params: Promise<{ id: string }> }) => Promise<Response>, t: Tenant, id: string) =>
    handler(withSession(`http://localhost/api/v1/session/invitations/${id}`, t.token, { method: "POST" }), { params: Promise.resolve({ id }) })

  async function inviteStaff(): Promise<string> {
    const res = await invite(
      withSession("http://localhost/api/v1/members/invite", shop.token, { method: "POST", body: JSON.stringify({ email: "nhan-vien@vi-du.test", role_id: roleId }) })
    )
    expect(res.status).toBe(201)
    return ((await readJson(res)).membership as { id: string }).id
  }

  const myInvitations = async (t: Tenant) =>
    (await readJson(await listInvitations(withSession("http://localhost/api/v1/session/invitations", t.token)))).data as Array<{ membership_id: string; organization_name: string }>

  beforeEach(async () => {
    await resetDatabase()
    shop = await createTenant("tiem-moi")
    staff = await createTenant("nhan-vien")
    const role = await new RoleRepository().findSystemRoleByKey("sale")
    if (!role) throw new Error("Thiếu vai sale")
    roleId = role.id
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("người được mời thấy lời mời, nhận xong chuyển sang tổ chức mới được", async () => {
    const id = await inviteStaff()
    const list = await myInvitations(staff)
    expect(list.map((i) => i.membership_id)).toEqual([id])
    expect(list[0]?.organization_name).toBe("Tiệm hoa tiem-moi")

    expect((await call(accept, staff, id)).status).toBe(200)
    expect((await prisma.memberships.findUniqueOrThrow({ where: { id } })).status).toBe("ACTIVE")
    expect(await myInvitations(staff)).toEqual([])

    const res = await switchOrg(
      withSession("http://localhost/api/v1/session/organization", staff.token, { method: "POST", body: JSON.stringify({ organization_id: shop.organizationId }) })
    )
    expect(res.status).toBe(200)
  })

  it("người khác không nhận/từ chối hộ được → 404, lời mời giữ nguyên", async () => {
    const id = await inviteStaff()
    expect((await call(accept, shop, id)).status).toBe(404)
    expect((await call(decline, shop, id)).status).toBe(404)
    expect((await prisma.memberships.findUniqueOrThrow({ where: { id } })).status).toBe("INVITED")
  })

  it("từ chối → lời mời biến mất", async () => {
    const id = await inviteStaff()
    expect((await call(decline, staff, id)).status).toBe(200)
    expect(await prisma.memberships.findUnique({ where: { id } })).toBeNull()
  })

  it("quá 14 ngày → không còn trong danh sách, nhận bị từ chối; mời lại thì làm mới hạn", async () => {
    const id = await inviteStaff()
    await prisma.memberships.update({ where: { id }, data: { invited_at: new Date(Date.now() - 15 * 86_400_000) } })
    expect(await myInvitations(staff)).toEqual([])
    expect((await call(accept, staff, id)).status).toBe(409)

    expect(await inviteStaff()).toBe(id)
    expect((await myInvitations(staff)).map((i) => i.membership_id)).toEqual([id])
  })
})
