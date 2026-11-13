import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as getMargin } from "@/app/api/v1/platform/margin/route"
import { OrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { PlatformOperatorRepository } from "@/modules/platform/infra/platform-operator-repository"
import { recordProviderCost } from "@/modules/usage/infra/provider-cost-repository"
import { creditPeriod } from "@/modules/usage/domain/monthly-limit"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/** Checklist ALG 10.4 — `provider_cost_entries` + chi phí AI: biên lợi nhuận = credit quy đổi − chi phí; cần N4. */
describe("biên lợi nhuận nền tảng", () => {
  let a: Tenant
  let b: Tenant
  let op: Tenant
  let reader: Tenant
  const URL_ = `http://localhost/api/v1/platform/margin?period=${creditPeriod()}`

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("margin-a")
    b = await createTenant("margin-b")
    op = await createTenant("margin-op")
    reader = await createTenant("margin-reader")
    await new PlatformOperatorRepository().grant(op.userId, ["N4"], null)
    await new PlatformOperatorRepository().grant(reader.userId, ["N1"], null)
    await prisma.platform_settings.upsert({
      where: { key: "credit_pricing" },
      create: { key: "credit_pricing", value: { usdToVnd: 25_000, creditValueVnd: 1_000 } },
      update: { value: { usdToVnd: 25_000, creditValueVnd: 1_000 } },
    })
  })

  afterAll(async () => {
    await prisma.platform_settings.deleteMany({ where: { key: "credit_pricing" } })
    await disconnectDatabase()
  })

  it("credit đã dùng sau hoàn × giá trị credit − chi phí AI − chi phí tin; tổ chức không phát sinh không có dòng", async () => {
    const repo = new OrganizationRepository()
    await repo.topUpCredit(a.organizationId, 100, "TOPUP", { reason: "Nạp" })
    await repo.tryDeductCredit(a.ctx, 10, { service: "AI" })
    await repo.refundCredit(a.ctx, 2, { service: "AI" })
    await prisma.ai_requests.create({ data: { organization_id: a.organizationId, capability_code: "B1", model_key: "m", source: "CORE", outcome: "ACCEPTED", cost_usd: 0.1 } })
    await recordProviderCost(a.organizationId, { provider: "ESMS", service: "SMS", costVnd: 500 })

    expect((await getMargin(withSession(URL_, reader.token))).status).toBe(403)
    const body = (await readJson(await getMargin(withSession(URL_, op.token)))) as {
      data: { rows: Array<{ organizationId: string; creditUsed: number; revenueVnd: number; costVnd: number; marginVnd: number }> }
    }
    const rowA = body.data.rows.find((r) => r.organizationId === a.organizationId)
    expect(rowA).toMatchObject({ creditUsed: 8, revenueVnd: 8_000, costVnd: 3_000, marginVnd: 5_000 })
    expect(body.data.rows.some((r) => r.organizationId === b.organizationId)).toBe(false)
    expect((await getMargin(withSession("http://localhost/api/v1/platform/margin?period=2026-13", op.token))).status).toBe(400)
  })
})
