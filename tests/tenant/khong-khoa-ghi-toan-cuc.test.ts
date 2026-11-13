import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { BranchRepository } from "@/modules/organization/infra/branch-repository"
import { RoleRepository } from "@/modules/organization/infra/role-repository"
import { ensureSystemRoles } from "@/modules/organization/use-cases/ensure-system-roles"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { SYSTEM_ROLES } from "@/modules/organization/domain/system-roles"

/**
 * `YC-T9` — không khoá ghi toàn cục. Đồng thời hoá bằng giao dịch cơ sở dữ
 * liệu.
 *
 * Đây là phản đề trực tiếp của `he_thong.giu_khoa()` ở FloraOS v1, nơi một
 * khoá ghi 15 phút thuộc về một thư mục: người thứ hai bấm chạy thì bị chặn,
 * kể cả khi họ ở một tổ chức khác. Phép thử dưới đây hỏng ngay nếu ai đó lắp
 * lại một khoá như vậy.
 */
describe("không khoá ghi toàn cục", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("hai tổ chức ghi đồng thời, không ai chặn ai", async () => {
    const branches = new BranchRepository()

    const writes = [
      ...Array.from({ length: 8 }, (_, i) =>
        branches.create(a.ctx, { name: `A${i}`, code: `A${i}` })
      ),
      ...Array.from({ length: 8 }, (_, i) =>
        branches.create(b.ctx, { name: `B${i}`, code: `B${i}` })
      ),
    ]

    const created = await Promise.all(writes)
    expect(created).toHaveLength(16)

    expect(await branches.list(a.ctx)).toHaveLength(8)
    expect(await branches.list(b.ctx)).toHaveLength(8)
  })

  it("mã chi nhánh duy nhất trong phạm vi tổ chức, không phải toàn hệ thống", async () => {
    const branches = new BranchRepository()

    await branches.create(a.ctx, { name: "Chi nhánh 1", code: "CN01" })
    const sameCodeOtherTenant = await branches.create(b.ctx, {
      name: "Chi nhánh 1",
      code: "CN01",
    })

    expect(sameCodeOtherTenant.organization_id).toBe(b.organizationId)
    expect(await branches.list(a.ctx)).toHaveLength(1)
    expect(await branches.list(b.ctx)).toHaveLength(1)
  })

  it("nạp vai hệ thống nhiều lần song song vẫn ra đúng bốn vai", async () => {
    // Postgres coi mọi NULL là phân biệt, nên `@@unique([organization_id, key])`
    // không chặn được trùng cho vai hệ thống. Khoá tư vấn trong
    // `ensureSystemRoles` là thứ duy nhất chặn, và đây là test khoá nó.
    // memberships.role_id có khoá ngoại (RESTRICT): gỡ thành viên trước khi xoá vai hệ thống.
    await prisma.memberships.deleteMany({})
    await prisma.roles.deleteMany({ where: { organization_id: null } })

    await Promise.all([
      ensureSystemRoles(),
      ensureSystemRoles(),
      ensureSystemRoles(),
      ensureSystemRoles(),
    ])

    const roles = new RoleRepository()
    for (const { key } of SYSTEM_ROLES) {
      expect(await roles.findSystemRoleByKey(key)).not.toBeNull()
    }

    // Mỗi vai hệ thống đúng một dòng — nạp song song không sinh bản trùng
    const all = await prisma.roles.findMany({ where: { organization_id: null } })
    expect(all).toHaveLength(SYSTEM_ROLES.length)
  })

  it("hai người đăng ký cùng lúc không giành nhau slug", async () => {
    await resetDatabase()
    const [first, second] = await Promise.all([
      createTenant("song-song-1"),
      createTenant("song-song-2"),
    ])

    expect(first.organizationId).not.toBe(second.organizationId)
  })
})
