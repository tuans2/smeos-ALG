import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { logIn } from "@/modules/organization/use-cases/log-in"
import { signUp } from "@/modules/organization/use-cases/sign-up"
import { PlatformOperatorRepository } from "@/modules/platform/infra/platform-operator-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { TEST_PASSWORD } from "../helpers/fixtures"

/**
 * Bản cài mới (bản giao GD1, Bước 6): người vận hành đầu tiên tự đăng ký nên còn chờ duyệt, mà chỉ người vận
 * hành mới duyệt được. `npm run gan-van-hanh-nen-tang` gán quyền thì phải duyệt luôn tài khoản để đăng nhập được.
 */
describe("người vận hành đầu tiên của bản cài mới", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  const register = (email: string) =>
    signUp({ email, password: TEST_PASSWORD, name: "Vận hành", organizationName: "Ban vận hành", pendingApproval: true, seedProfile: false })

  it("tài khoản chờ duyệt không đăng nhập được; gán quyền vận hành thì duyệt và đăng nhập được", async () => {
    const { userId } = await register("van-hanh@vi-du.test")
    await expect(logIn({ email: "van-hanh@vi-du.test", password: TEST_PASSWORD })).rejects.toThrow()

    await new PlatformOperatorRepository().grant(userId, ["N1", "N13"], null)

    const user = await prisma.users.findUniqueOrThrow({ where: { id: userId } })
    expect(user.approval_status).toBe("APPROVED")
    expect(user.approval_decided_at).not.toBeNull()
    const session = await logIn({ email: "van-hanh@vi-du.test", password: TEST_PASSWORD })
    expect(session.userId).toBe(userId)
  })

  it("không mở lại tài khoản đã bị từ chối", async () => {
    const { userId } = await register("bi-tu-choi@vi-du.test")
    await prisma.users.update({ where: { id: userId }, data: { approval_status: "REJECTED" } })

    await new PlatformOperatorRepository().grant(userId, ["N1"], null)

    expect((await prisma.users.findUniqueOrThrow({ where: { id: userId } })).approval_status).toBe("REJECTED")
  })
})
