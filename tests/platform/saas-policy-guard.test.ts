import { afterAll, beforeEach, describe, expect, it } from "vitest"

// @release-strip — route không có trong bản giao GD1; phần còn lại của test vẫn chạy trên bản cắt
import { PUT as putSaasPolicy } from "@/app/api/v1/greeting-card/integrations/staff-notifications/saas-policy/route"
// @release-strip-end
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

  // @release-strip — route không có trong bản giao GD1; phần còn lại của test vẫn chạy trên bản cắt
  function policyRequest(token: string): Request {
    return withSession(`${BASE}/greeting-card/integrations/staff-notifications/saas-policy`, token, {
      method: "PUT",
      body: JSON.stringify({ target_organization_id: b.organizationId, allowed_channels: ["TELEGRAM", "SMS"] }),
    })
  }
  // @release-strip-end

  // @release-strip — route không có trong bản giao GD1; phần còn lại của test vẫn chạy trên bản cắt
  it("chủ tiệm A (đủ mọi quyền tenant) sửa chính sách của tiệm B → 403, không ghi gì", async () => {
    const res = await putSaasPolicy(policyRequest(a.token))
    expect(res.status).toBe(403)
    const integration = await prisma.greeting_integrations.findFirst({ where: { organization_id: b.organizationId } })
    expect(JSON.stringify(integration ?? {})).not.toContain("TELEGRAM")
  })
  // @release-strip-end

  // @release-strip — route không có trong bản giao GD1; phần còn lại của test vẫn chạy trên bản cắt
  it("người vận hành thiếu N2 → 403; có N2 → qua cổng quyền", async () => {
    await new PlatformOperatorRepository().grant(operator.userId, ["N1"], null)
    expect((await putSaasPolicy(policyRequest(operator.token))).status).toBe(403)

    await new PlatformOperatorRepository().grant(operator.userId, ["N1", "N2"], null)
    expect((await putSaasPolicy(policyRequest(operator.token))).status).not.toBe(403)
  })
  // @release-strip-end

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
