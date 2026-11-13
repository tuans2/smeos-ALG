import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { ALL_PLATFORM_CAPABILITY_CODES } from "@/core/platform/platform-capability-catalog"
import { verifyPassword } from "@/modules/organization/infra/password-hasher"
import { applyAccountCleanup, planAccountCleanup } from "@/modules/platform/infra/account-cleanup"
import { PlatformOperatorRepository } from "@/modules/platform/infra/platform-operator-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/** Dọn tài khoản trước bàn giao: chỉ giữ một superadmin (PO 22/10/2026, `scripts/don-tai-khoan.ts`). */
describe("dọn tài khoản, giữ một superadmin", () => {
  let keep: Tenant
  let other: Tenant
  let operator: Tenant

  beforeEach(async () => {
    await resetDatabase()
    keep = await createTenant("giu-lai")
    other = await createTenant("khach-thu")
    operator = await createTenant("van-hanh-cu")
    await new PlatformOperatorRepository().grant(operator.userId, ["N1"], null)
    await prisma.orders.create({
      data: { organization_id: other.organizationId, code: "DH-1", total_vnd: 1, balance_vnd: 1, created_by: other.userId },
    })
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("lập kế hoạch không ghi gì; liệt kê tài khoản sẽ xoá và tổ chức sẽ hết thành viên", async () => {
    const plan = await planAccountCleanup("giu-lai@vi-du.test")
    expect(plan.remove.map((u) => u.email).sort()).toEqual(["khach-thu@vi-du.test", "van-hanh-cu@vi-du.test"])
    expect(plan.orphanedOrganizations.map((o) => o.id).sort()).toEqual([other.organizationId, operator.organizationId].sort())
    expect(await prisma.users.count()).toBe(3)
  })

  it("xoá hẳn tài khoản khác (kèm phiên, thành viên, quyền vận hành); giữ tổ chức và đơn; cấp đủ mã N", async () => {
    await applyAccountCleanup(await planAccountCleanup("giu-lai@vi-du.test"), "mat-khau-moi-rat-dai")

    expect((await prisma.users.findMany({ select: { email: true } })).map((u) => u.email)).toEqual(["giu-lai@vi-du.test"])
    expect(await prisma.sessions.count({ where: { user_id: { in: [other.userId, operator.userId] } } })).toBe(0)
    expect(await prisma.memberships.count({ where: { user_id: { in: [other.userId, operator.userId] } } })).toBe(0)
    expect(await prisma.platform_operators.count({ where: { user_id: operator.userId } })).toBe(0)
    expect(await prisma.orders.count({ where: { organization_id: other.organizationId } })).toBe(1)

    const op = await new PlatformOperatorRepository().findActiveByUserId(keep.userId)
    expect([...(op?.capabilityCodes ?? [])].sort()).toEqual([...ALL_PLATFORM_CAPABILITY_CODES])

    const user = await prisma.users.findUniqueOrThrow({ where: { id: keep.userId } })
    expect(await verifyPassword("mat-khau-moi-rat-dai", user.password_hash ?? "")).toBe(true)
    expect(await prisma.sessions.count({ where: { user_id: keep.userId, revoked_at: null } })).toBe(0)
  })

  it("tài khoản giữ lại không tồn tại hoặc mật khẩu quá ngắn → dừng, không xoá gì", async () => {
    await expect(planAccountCleanup("khong-co@vi-du.test")).rejects.toThrow(/Không có tài khoản/)
    await expect(applyAccountCleanup(await planAccountCleanup("giu-lai@vi-du.test"), "ngan")).rejects.toThrow(/ít nhất 12/)
    expect(await prisma.users.count()).toBe(3)
  })
})
