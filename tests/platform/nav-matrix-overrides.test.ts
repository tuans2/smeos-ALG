import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { PUT as putNavMatrix } from "@/app/api/v1/platform/nav-matrix/route"
import initialOverrides from "@/lib/data/industry-nav-matrix-overrides.json"
import { resolveAppSession } from "@/modules/organization/use-cases/resolve-app-session"
import {
  NAV_MATRIX_SETTING_KEY,
  clearPlatformNavMatrixCache,
  getPlatformNavMatrixOverrides,
} from "@/modules/platform/infra/nav-matrix-store"
import { PlatformOperatorRepository } from "@/modules/platform/infra/platform-operator-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"

const URL = "http://localhost/api/v1/platform/nav-matrix"

function cookieOf(token: string): string {
  return withSession(URL, token).headers.get("cookie") ?? ""
}

/**
 * Ma trận điều hướng Admin lưu trước đây ghi vào tệp trên máy chủ: mất khi deploy, và menu không
 * đọc nó (menu đóng gói tệp JSON lúc build) — rà soát M13, 22/10/2026.
 */
describe("ma trận điều hướng theo ngành lưu ở CSDL", () => {
  let operator: Tenant
  let shop: Tenant

  beforeEach(async () => {
    await resetDatabase()
    await prisma.platform_settings.deleteMany()
    clearPlatformNavMatrixCache()
    operator = await createTenant("nav-van-hanh")
    shop = await createTenant("nav-tiem-fnb")
    await prisma.organizations.update({
      where: { id: shop.organizationId },
      data: { industry_key: "FNB", settings: { industry_locked: true } }, // ADR-012 T-6c-2: ngành chỉ ở cột
    })
  })

  afterAll(async () => {
    await prisma.platform_settings.deleteMany()
    await disconnectDatabase()
  })

  it("chưa ai lưu: giữ đúng tệp JSON đã commit làm giá trị khởi đầu", async () => {
    const overrides = await getPlatformNavMatrixOverrides()
    expect(overrides.FLORAL).toEqual((initialOverrides as Record<string, string[]>).FLORAL ?? [])
  })

  it("Admin có N12 lưu → ghi vào CSDL kèm người sửa, phiên của tiệm cùng ngành nhận ngay", async () => {
    await new PlatformOperatorRepository().grant(operator.userId, ["N12"], null)
    const res = await putNavMatrix(
      withSession(URL, operator.token, { method: "PUT", body: JSON.stringify({ overrides: { FNB: ["chat", "catalog"] } }) })
    )
    expect(res.status).toBe(200)

    const row = await prisma.platform_settings.findUniqueOrThrow({ where: { key: NAV_MATRIX_SETTING_KEY } })
    expect((row.value as Record<string, string[]>).FNB).toEqual(["chat", "catalog"])
    expect(row.updated_by).toBe(operator.userId)

    clearPlatformNavMatrixCache() // như một instance khác đọc lại từ CSDL
    const session = await resolveAppSession(cookieOf(shop.token))
    expect(session?.organization?.navHiddenKeys).toEqual(["chat", "catalog"])

    const operatorSession = await resolveAppSession(cookieOf(operator.token)) // ngành FLORAL, không ghi đè
    expect(operatorSession?.organization?.navHiddenKeys).toBeNull()
  })

  it("không có N12 → 403, CSDL không có dòng nào", async () => {
    const res = await putNavMatrix(
      withSession(URL, shop.token, { method: "PUT", body: JSON.stringify({ overrides: { FNB: [] } }) })
    )
    expect(res.status).toBe(403)
    expect(await prisma.platform_settings.count()).toBe(0)
  })
})
