import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { PATCH as patchOrganization } from "@/app/api/v1/organizations/current/route"
import { PlatformOperatorRepository } from "@/modules/platform/infra/platform-operator-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"

const URL = "http://localhost/api/v1/organizations/current"

function patch(token: string, settings: Record<string, unknown>): Promise<Response> {
  return patchOrganization(withSession(URL, token, { method: "PATCH", body: JSON.stringify({ settings }) }))
}

async function settingsOf(t: Tenant): Promise<Record<string, unknown>> {
  const org = await prisma.organizations.findUniqueOrThrow({ where: { id: t.organizationId } })
  return (org.settings as Record<string, unknown> | null) ?? {}
}

/**
 * Khoá ngành trước đây chỉ là ẩn nút trên giao diện — máy chủ nhận mọi khoá settings, nên tiệm tự
 * gửi `industry_locked: false` là mở được (rà soát 21/10/2026, H11).
 */
describe("khoá ngành kiểm ở máy chủ", () => {
  let shop: Tenant

  beforeEach(async () => {
    await resetDatabase()
    shop = await createTenant("tiem-khoa-nganh") // đăng ký thật → industry_locked: true
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("chủ tiệm đổi ngành hoặc tự mở khoá → 403, settings không đổi", async () => {
    const before = await settingsOf(shop)
    expect(before.industry_locked).toBe(true)

    expect((await patch(shop.token, { industry: "FNB" })).status).toBe(403)
    expect((await patch(shop.token, { industry_locked: false })).status).toBe(403)
    expect(await settingsOf(shop)).toEqual(before)
  })

  it("cấu hình thường vẫn sửa được như cũ", async () => {
    expect((await patch(shop.token, { brochure_discount: { max_percent: 10 } })).status).toBe(200)
    expect((await settingsOf(shop)).brochure_discount).toEqual({ max_percent: 10 })
  })

  it("người vận hành nền tảng có N12 đổi được ngành của tổ chức mình đang mở", async () => {
    await new PlatformOperatorRepository().grant(shop.userId, ["N12"], null)
    expect((await patch(shop.token, { industry: "FNB" })).status).toBe(200)
    // T-6c-1: ngành ghi vào cột `industry_key`, không còn nằm trong settings
    const org = await prisma.organizations.findUniqueOrThrow({ where: { id: shop.organizationId } })
    expect(org.industry_key).toBe("FNB")
    expect((org.settings as Record<string, unknown>).industry).toBeUndefined()
  })
})
