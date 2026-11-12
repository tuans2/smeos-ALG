import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { ensureSystemRoles } from "@/modules/organization/use-cases/ensure-system-roles"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"

/** Bản cài cũ còn tên vai hệ thống cũ (vd. "Experience User") được đổi theo danh mục ở lần seed kế tiếp. */
describe("tên vai hệ thống theo danh mục", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("seed lại cập nhật tên vai hệ thống, không đụng vai riêng của tổ chức", async () => {
    await prisma.roles.updateMany({ where: { organization_id: null, key: "experience_user" }, data: { name: "Experience User" } })
    await ensureSystemRoles()
    const role = await prisma.roles.findFirstOrThrow({ where: { organization_id: null, key: "experience_user" } })
    expect(role.name).toBe("Người dùng trải nghiệm")
    expect(await prisma.roles.count({ where: { organization_id: null, key: "experience_user" } })).toBe(1)
  })
})
