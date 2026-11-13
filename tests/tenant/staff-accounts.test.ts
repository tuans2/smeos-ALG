import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, withSession, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import { RoleRepository } from "@/modules/organization/infra/role-repository"
import { logIn } from "@/modules/organization/use-cases/log-in"
import { GET as membersGet, POST as membersPost } from "@/app/api/v1/members/route"
import { POST as resetPost } from "@/app/api/v1/members/[id]/reset-password/route"
import { PATCH as statusPatch } from "@/app/api/v1/members/[id]/status/route"
import { POST as passwordPost } from "@/app/api/v1/session/password/route"
import { resetRateLimits } from "@/core/http/rate-limit"

/**
 * PO 08/10/2026 (Q1): Điều hành tự tạo tài khoản cho Sale/Điều phối — dùng được ngay bằng mật khẩu
 * tạm, đặt lại mật khẩu, tạm khoá/mở, nhân viên tự đổi mật khẩu. Cách ly tiệm: tiệm khác → 404.
 */

const url = (path: string) => `http://localhost/api/v1${path}`
const params = (id: string) => ({ params: Promise.resolve({ id }) })
const json = (token: string, path: string, method: string, body: unknown) =>
  withSession(url(path), token, { method, body: JSON.stringify(body) })

describe("tài khoản nhân viên do Điều hành quản lý", () => {
  let a: Tenant
  let b: Tenant
  let saleRoleId: string

  beforeEach(async () => {
    await resetDatabase()
    resetRateLimits()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    saleRoleId = (await new RoleRepository().findSystemRoleByKey("sale"))!.id
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function createSale(email = "sale1@tiem-a.vn") {
    const res = await membersPost(json(a.token, "/members", "POST", { name: "Lan Sale", email, role_id: saleRoleId }))
    expect(res.status).toBe(201)
    return ((await res.json()) as { data: { membershipId: string; userId: string; temporaryPassword: string } }).data
  }

  it("Điều hành tạo nhân viên → đăng nhập được ngay bằng mật khẩu tạm, đúng vai Sale, có nhật ký không lộ mật khẩu", async () => {
    const created = await createSale()
    expect(created.temporaryPassword).toHaveLength(12)
    const login = await logIn({ email: "sale1@tiem-a.vn", password: created.temporaryPassword })
    expect(login.organizationId).toBe(a.organizationId)

    const m = await prisma.memberships.findUniqueOrThrow({ where: { id: created.membershipId } })
    expect(m).toMatchObject({ status: "ACTIVE", role_id: saleRoleId, organization_id: a.organizationId })
    const audit = await prisma.audit_logs.findFirstOrThrow({ where: { organization_id: a.organizationId, action: "member.account.create" } })
    expect(JSON.stringify(audit)).not.toContain(created.temporaryPassword)
  })

  it("email đã có tài khoản → 409; Sale không tạo được tài khoản (403)", async () => {
    await createSale()
    const dup = await membersPost(json(a.token, "/members", "POST", { name: "Trùng", email: "SALE1@tiem-a.vn", role_id: saleRoleId }))
    expect(dup.status).toBe(409)
    const sale = await addStaffWithSession(a, "sale", "lan")
    const denied = await membersPost(json(sale.token, "/members", "POST", { name: "X", email: "x@tiem-a.vn", role_id: saleRoleId }))
    expect(denied.status).toBe(403)
  })

  it("đặt lại mật khẩu: mật khẩu cũ hết dùng, phiên cũ bị đăng xuất; Điều hành tiệm khác nhận 404", async () => {
    const created = await createSale()
    const session = await logIn({ email: "sale1@tiem-a.vn", password: created.temporaryPassword })

    const other = await resetPost(json(b.token, `/members/${created.membershipId}/reset-password`, "POST", {}), params(created.membershipId))
    expect(other.status).toBe(404)

    const res = await resetPost(json(a.token, `/members/${created.membershipId}/reset-password`, "POST", {}), params(created.membershipId))
    expect(res.status).toBe(200)
    const { temporaryPassword } = ((await res.json()) as { data: { temporaryPassword: string } }).data
    await expect(logIn({ email: "sale1@tiem-a.vn", password: created.temporaryPassword })).rejects.toMatchObject({ code: "UNAUTHENTICATED" })
    expect((await membersGet(withSession(url("/members"), session.token))).status).toBe(401)
    await expect(logIn({ email: "sale1@tiem-a.vn", password: temporaryPassword })).resolves.toMatchObject({ organizationId: a.organizationId })
  })

  it("không đặt lại được mật khẩu của người còn thuộc tiệm khác (chống chiếm tài khoản)", async () => {
    const created = await createSale()
    await prisma.memberships.create({ data: { organization_id: b.organizationId, user_id: created.userId, role_id: saleRoleId, status: "ACTIVE" } })
    const res = await resetPost(json(a.token, `/members/${created.membershipId}/reset-password`, "POST", {}), params(created.membershipId))
    expect(res.status).toBe(409)
  })

  it("tạm khoá: nhân viên mất quyền ngay, dữ liệu giữ nguyên; mở lại thì vào lại được", async () => {
    const created = await createSale()
    // Nhân viên đã đổi mật khẩu tạm (checklist ALG 1.4 — có test riêng temporary-password-gate.test.ts)
    await prisma.users.update({ where: { id: created.userId }, data: { must_change_password: false } })
    const session = await logIn({ email: "sale1@tiem-a.vn", password: created.temporaryPassword })
    const lock = await statusPatch(json(a.token, `/members/${created.membershipId}/status`, "PATCH", { active: false }), params(created.membershipId))
    expect(lock.status).toBe(200)
    expect((await membersGet(withSession(url("/members"), session.token))).status).not.toBe(200)
    expect((await prisma.memberships.findUniqueOrThrow({ where: { id: created.membershipId } })).status).toBe("SUSPENDED")

    await statusPatch(json(a.token, `/members/${created.membershipId}/status`, "PATCH", { active: true }), params(created.membershipId))
    const again = await logIn({ email: "sale1@tiem-a.vn", password: created.temporaryPassword })
    expect((await membersGet(withSession(url("/members"), again.token))).status).toBe(200)
  })

  it("Điều hành không tự khoá chính mình (422); Sale không khoá được ai (403)", async () => {
    const self = await prisma.memberships.findFirstOrThrow({ where: { organization_id: a.organizationId, user_id: a.userId } })
    expect((await statusPatch(json(a.token, `/members/${self.id}/status`, "PATCH", { active: false }), params(self.id))).status).toBe(422)
    const sale = await addStaffWithSession(a, "sale", "lan")
    expect((await statusPatch(json(sale.token, `/members/${self.id}/status`, "PATCH", { active: false }), params(self.id))).status).toBe(403)
  })

  it("nhân viên tự đổi mật khẩu: sai mật khẩu hiện tại → 400; đổi xong giữ phiên đang dùng", async () => {
    const created = await createSale()
    const session = await logIn({ email: "sale1@tiem-a.vn", password: created.temporaryPassword })
    const wrong = await passwordPost(json(session.token, "/session/password", "POST", { current_password: "sai-mat-khau", new_password: "MatKhauMoi2026" }))
    expect(wrong.status).toBe(400)
    const ok = await passwordPost(json(session.token, "/session/password", "POST", { current_password: created.temporaryPassword, new_password: "MatKhauMoi2026" }))
    expect(ok.status).toBe(200)
    expect((await membersGet(withSession(url("/members"), session.token))).status).toBe(200)
    await expect(logIn({ email: "sale1@tiem-a.vn", password: "MatKhauMoi2026" })).resolves.toBeTruthy()
  })
})
