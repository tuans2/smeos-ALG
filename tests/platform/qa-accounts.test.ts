import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { QA_ORGANIZATION_NAME, createQaAccounts, qaAccountsProblems } from "@/modules/platform/infra/qa-accounts"
import { verifyPassword } from "@/modules/organization/infra/password-hasher"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant } from "../helpers/fixtures"

const INPUT = {
  ownerEmail: "test01@avilotusgroup.com",
  ownerPassword: "mat-khau-test-01-dai",
  staffEmail: "test02@avilotusgroup.com",
  staffPassword: "mat-khau-test-02-dai",
  staffRoleKey: "sale",
}

/** Hai tài khoản test chức năng (PO 22/10/2026, `scripts/tao-tai-khoan-test.ts`). */
describe("tạo tài khoản test", () => {
  beforeEach(async () => {
    await resetDatabase()
    await createTenant("co-san") // dựng vai hệ thống như production
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function roleOf(email: string): Promise<{ org: string; role: string | undefined }> {
    const user = await prisma.users.findUniqueOrThrow({ where: { email }, include: { memberships: { include: { organization: true } } } })
    expect(user.memberships).toHaveLength(1)
    const role = await prisma.roles.findUnique({ where: { id: user.memberships[0]!.role_id } })
    return { org: user.memberships[0]!.organization.name, role: role?.key }
  }

  it("test01 Điều hành và test02 Sale cùng tổ chức riêng smeOS QA; không ai có mã nền tảng", async () => {
    const result = await createQaAccounts(INPUT)

    expect(await roleOf("test01@avilotusgroup.com")).toEqual({ org: QA_ORGANIZATION_NAME, role: "dieu_hanh" })
    expect(await roleOf("test02@avilotusgroup.com")).toEqual({ org: QA_ORGANIZATION_NAME, role: "sale" })
    const staff = await prisma.memberships.findFirstOrThrow({ where: { user_id: result.staffUserId } })
    expect(staff.organization_id).toBe(result.organizationId)
    expect(staff.status).toBe("ACTIVE")

    expect(await prisma.platform_operators.count({ where: { user_id: { in: [result.ownerUserId, result.staffUserId] } } })).toBe(0)
    expect(await prisma.sessions.count({ where: { user_id: result.ownerUserId, revoked_at: null } })).toBe(0)

    const owner = await prisma.users.findUniqueOrThrow({ where: { id: result.ownerUserId } })
    expect(await verifyPassword(INPUT.ownerPassword, owner.password_hash ?? "")).toBe(true)
  })

  it("dữ liệu sai hoặc trùng → báo lỗi, không tạo gì", async () => {
    expect(await qaAccountsProblems(INPUT)).toEqual([])
    const bad = await qaAccountsProblems({
      ...INPUT,
      ownerEmail: "co-san@vi-du.test",
      staffPassword: INPUT.ownerPassword.slice(0, 5),
      staffRoleKey: "khong-co-vai-nay",
    })
    expect(bad.join("\n")).toMatch(/Đã có tài khoản co-san@vi-du\.test/)
    expect(bad.join("\n")).toMatch(/ít nhất 12/)
    expect(bad.join("\n")).toMatch(/Không có vai hệ thống/)
    expect((await qaAccountsProblems({ ...INPUT, staffPassword: INPUT.ownerPassword })).join()).toMatch(/hai mật khẩu khác nhau/)

    const before = await prisma.users.count()
    await expect(createQaAccounts({ ...INPUT, staffRoleKey: "khong-co-vai-nay" })).rejects.toThrow()
    expect(await prisma.users.count()).toBe(before)
  })
})
