import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as getMyFlags } from "@/app/api/v1/ux-rollout-flags/route"
import { PUT as putFlags } from "@/app/api/v1/platform/ux-rollout-flags/route"
import { PlatformOperatorRepository } from "@/modules/platform/infra/platform-operator-repository"
import { UX_ROLLOUT_SETTING_KEY, clearUxRolloutFlagCache } from "@/modules/platform/infra/ux-rollout-flag-store"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"

const ADMIN_URL = "http://localhost/api/v1/platform/ux-rollout-flags"
const MY_URL = "http://localhost/api/v1/ux-rollout-flags"

/** Cờ rollout UX (03c E9): bật theo tổ chức, tổ chức khác không thấy và không bị bật theo. */
describe("cờ rollout UX lưu ở platform_settings", () => {
  let operator: Tenant
  let shopA: Tenant
  let shopB: Tenant

  beforeEach(async () => {
    await resetDatabase()
    await prisma.platform_settings.deleteMany()
    clearUxRolloutFlagCache()
    operator = await createTenant("ux-van-hanh")
    shopA = await createTenant("ux-tiem-a")
    shopB = await createTenant("ux-tiem-b")
  })

  afterAll(async () => {
    await prisma.platform_settings.deleteMany()
    await disconnectDatabase()
  })

  async function myFlags(t: Tenant): Promise<string[]> {
    const res = await getMyFlags(withSession(MY_URL, t.token))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { enabled: string[] } }
    return body.data.enabled
  }

  it("chưa cấu hình: mọi cờ tắt", async () => {
    expect(await myFlags(shopA)).toEqual([])
  })

  it("thiếu N12 thì không được đổi cờ", async () => {
    const res = await putFlags(
      withSession(ADMIN_URL, operator.token, { method: "PUT", body: JSON.stringify({ flags: {} }) }),
    )
    expect(res.status).toBe(403)
  })

  it("allowlist chỉ bật cho đúng tổ chức, ghi người sửa; client không thấy danh sách tổ chức", async () => {
    await new PlatformOperatorRepository().grant(operator.userId, ["N12"], null)
    const res = await putFlags(
      withSession(ADMIN_URL, operator.token, {
        method: "PUT",
        body: JSON.stringify({ flags: { ux_pd_anh_san_pham: { mode: "allowlist", organizationIds: [shopA.organizationId] } } }),
      }),
    )
    expect(res.status).toBe(200)
    const row = await prisma.platform_settings.findUniqueOrThrow({ where: { key: UX_ROLLOUT_SETTING_KEY } })
    expect(row.updated_by).toBe(operator.userId)

    clearUxRolloutFlagCache()
    expect(await myFlags(shopA)).toEqual(["ux_pd_anh_san_pham"])
    expect(await myFlags(shopB)).toEqual([])

    const raw = await (await getMyFlags(withSession(MY_URL, shopB.token))).text()
    expect(raw).not.toContain(shopA.organizationId)
  })
})
