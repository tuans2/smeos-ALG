import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as invite } from "@/app/api/v1/members/invite/route"
import { RoleRepository } from "@/modules/organization/infra/role-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * UJ-06 (audit hành trình 06/11/2026, M1): mời một email CHƯA có tài khoản từng tạo `users` với mật khẩu rỗng và
 * thành viên `INVITED` — không có bước nhận lời mời/đặt mật khẩu nên người đó không bao giờ đăng nhập được.
 * Nay từ chối và chỉ sang "Thêm nhân viên" (tạo tài khoản dùng được ngay). Mời người ĐÃ có tài khoản giữ nguyên.
 */
describe("POST /members/invite — không tạo tài khoản ngõ cụt", () => {
  let shop: Tenant
  let roleId: string

  const call = (email: string) =>
    invite(
      withSession("http://localhost/api/v1/members/invite", shop.token, {
        method: "POST",
        body: JSON.stringify({ email, role_id: roleId }),
      })
    )

  beforeEach(async () => {
    await resetDatabase()
    shop = await createTenant("tiem-moi")
    const role = await new RoleRepository().findSystemRoleByKey("sale")
    if (!role) throw new Error("Thiếu vai sale")
    roleId = role.id
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("email chưa có tài khoản → 422 chỉ sang Thêm nhân viên, không tạo users/memberships", async () => {
    const usersBefore = await prisma.users.count()
    const res = await call("nguoi-moi@vi-du.test")
    expect(res.status).toBe(422)
    expect(JSON.stringify(await readJson(res))).toContain("Thêm nhân viên")
    expect(await prisma.users.count()).toBe(usersBefore)
    expect(await prisma.users.findUnique({ where: { email: "nguoi-moi@vi-du.test" } })).toBeNull()
  })

  it("người đã có tài khoản (ở tiệm khác) vẫn mời được như trước", async () => {
    await createTenant("tiem-khac")
    const res = await call("tiem-khac@vi-du.test")
    expect(res.status).toBe(201)
    const user = await prisma.users.findUniqueOrThrow({ where: { email: "tiem-khac@vi-du.test" } })
    const m = await prisma.memberships.findFirstOrThrow({ where: { organization_id: shop.organizationId, user_id: user.id } })
    expect(m.status).toBe("INVITED")
  })
})
