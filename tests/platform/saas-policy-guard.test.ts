import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { PUT as putNavMatrix } from "@/app/api/v1/platform/nav-matrix/route"
import { PlatformOperatorRepository } from "@/modules/platform/infra/platform-operator-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1"

/**
 * Chính sách kênh SaaS nhận `target_organization_id` trong body — trước đây chỉ gác bằng mã R2
 * của tenant, nên chủ tiệm A sửa được kênh của tiệm B (rà soát 21/10/2026).
 */
describe("chính sách kênh thông báo SaaS chỉ dành cho người vận hành nền tảng", () => {
  let a: Tenant
  let b: Tenant
  let operator: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("saas-a")
    b = await createTenant("saas-b")
    operator = await createTenant("saas-van-hanh")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })




  it("ma trận điều hướng: người vận hành thiếu N12 không sửa được", async () => {
    await new PlatformOperatorRepository().grant(operator.userId, ["N1"], null)
    const res = await putNavMatrix(
      withSession(`${BASE}/platform/nav-matrix`, operator.token, {
        method: "PUT",
        body: JSON.stringify({ overrides: { FLORAL: [] } }),
      })
    )
    expect(res.status).toBe(403)
  })
})
