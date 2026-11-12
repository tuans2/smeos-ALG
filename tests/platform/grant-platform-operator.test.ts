import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { grantPlatformOperator } from "@/modules/platform/use-cases/grant-platform-operator"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * Bước 6 bàn giao GD1: hệ thống mới dựng chưa có người vận hành để duyệt đăng ký, tài khoản đầu tiên kẹt ở
 * "chờ duyệt". Công cụ `gan-van-hanh-nen-tang` (chủ hệ thống chạy phía máy chủ) gán quyền và duyệt luôn.
 */
describe("gán người vận hành nền tảng cho tài khoản mới đăng ký", () => {
  let t: Tenant
  beforeEach(async () => {
    await resetDatabase()
    t = await createTenant("van-hanh-dau-tien")
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("tài khoản đang chờ duyệt → có quyền vận hành và được duyệt", async () => {
    await prisma.users.update({ where: { id: t.userId }, data: { approval_status: "PENDING" } })
    const res = await grantPlatformOperator({ id: t.userId, approval_status: "PENDING" }, ["N1", "N2"], null)
    expect(res.approved).toBe(true)
    const user = await prisma.users.findUniqueOrThrow({ where: { id: t.userId } })
    expect(user.approval_status).toBe("APPROVED")
    expect(user.approval_decided_by).toBe(t.userId)
    const caps = await prisma.platform_role_capabilities.findMany({ where: { operator: { user_id: t.userId } }, select: { capability_code: true } })
    expect(caps.map((c) => c.capability_code).sort()).toEqual(["N1", "N2"])
  })

  it("tài khoản đã duyệt → chỉ gán quyền; tài khoản bị từ chối → không tự mở lại", async () => {
    expect((await grantPlatformOperator({ id: t.userId, approval_status: "APPROVED" }, ["N1"], null)).approved).toBe(false)
    await prisma.users.update({ where: { id: t.userId }, data: { approval_status: "REJECTED" } })
    await expect(grantPlatformOperator({ id: t.userId, approval_status: "REJECTED" }, ["N1"], null)).rejects.toThrow("từ chối")
    expect((await prisma.users.findUniqueOrThrow({ where: { id: t.userId } })).approval_status).toBe("REJECTED")
  })
})
