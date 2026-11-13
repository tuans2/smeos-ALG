import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as me } from "@/app/api/v1/auth/me/route"
import { POST as membersPost } from "@/app/api/v1/members/route"
import { POST as resetPost } from "@/app/api/v1/members/[id]/reset-password/route"
import { GET as listOccasions } from "@/app/api/v1/occasions/route"
import { POST as passwordPost } from "@/app/api/v1/session/password/route"
import { resetRateLimits } from "@/core/http/rate-limit"
import { RoleRepository } from "@/modules/organization/infra/role-repository"
import { logIn } from "@/modules/organization/use-cases/log-in"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/** Checklist ALG 1.4 — tài khoản dùng mật khẩu tạm phải tự đổi trước khi dùng hệ thống. */

const url = (path: string) => `http://localhost/api/v1${path}`
const params = (id: string) => ({ params: Promise.resolve({ id }) })

describe("bắt buộc đổi mật khẩu tạm lần đầu", () => {
  let a: Tenant

  beforeEach(async () => {
    await resetDatabase()
    resetRateLimits()
    a = await createTenant("alpha")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function createStaff() {
    const roleId = (await new RoleRepository().findSystemRoleByKey("sale"))!.id
    const res = await membersPost(withSession(url("/members"), a.token, {
      method: "POST", body: JSON.stringify({ name: "Lan Sale", email: "lan@tiem-a.vn", role_id: roleId }),
    }))
    expect(res.status).toBe(201)
    return ((await res.json()) as { data: { membershipId: string; userId: string; temporaryPassword: string } }).data
  }

  it("mật khẩu tạm: API nghiệp vụ trả 403 PASSWORD_CHANGE_REQUIRED, /auth/me báo cờ; đổi xong dùng được bình thường", async () => {
    const staff = await createStaff()
    const { token } = await logIn({ email: "lan@tiem-a.vn", password: staff.temporaryPassword })

    const blocked = await listOccasions(withSession(url("/occasions"), token))
    expect(blocked.status).toBe(403)
    expect(((await readJson(blocked)).error as { code: string }).code).toBe("PASSWORD_CHANGE_REQUIRED")

    const before = await readJson(await me(withSession(url("/auth/me"), token)))
    expect((before.user as { mustChangePassword: boolean }).mustChangePassword).toBe(true)

    const changed = await passwordPost(withSession(url("/session/password"), token, {
      method: "POST", body: JSON.stringify({ current_password: staff.temporaryPassword, new_password: "mat-khau-moi-cua-lan" }),
    }))
    expect(changed.status).toBe(200)

    expect((await listOccasions(withSession(url("/occasions"), token))).status).toBe(200)
    const after = await readJson(await me(withSession(url("/auth/me"), token)))
    expect((after.user as { mustChangePassword: boolean }).mustChangePassword).toBe(false)
  })

  it("Điều hành đặt lại mật khẩu → tài khoản lại phải đổi mật khẩu tạm", async () => {
    const staff = await createStaff()
    await prisma.users.update({ where: { id: staff.userId }, data: { must_change_password: false } })

    const reset = await resetPost(withSession(url(`/members/${staff.membershipId}/reset-password`), a.token, { method: "POST" }), params(staff.membershipId))
    expect(reset.status).toBe(200)
    expect((await prisma.users.findUniqueOrThrow({ where: { id: staff.userId } })).must_change_password).toBe(true)
  })

  it("tài khoản tự đăng ký (không dùng mật khẩu tạm) không bị chặn", async () => {
    expect((await listOccasions(withSession(url("/occasions"), a.token))).status).toBe(200)
  })
})
