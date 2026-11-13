import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as summaryRoute } from "@/app/api/v1/usage/summary/route"
import { prisma } from "@/core/tenancy/infra/prisma"
import { setMonthlyLimit } from "@/modules/usage/infra/usage-limit-repository"
import { runInTransaction } from "@/modules/organization/infra/transaction"
import { upsertSubscription } from "@/modules/subscription/infra/subscription-repository"
import { creditPeriod } from "@/modules/usage/domain/monthly-limit"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/** Checklist ALG 6.9 — mức dùng AI theo tháng, so với hạn mức tháng và credit tặng theo gói; tổ chức khác không lẫn. */
describe("mức dùng theo kỳ", () => {
  let a: Tenant
  let b: Tenant
  const URL_ = "http://localhost/api/v1/usage/summary"

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("us-a")
    b = await createTenant("us-b")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function use(t: Tenant, credit: number, at: Date) {
    const ws = await prisma.workspaces.findFirstOrThrow({ where: { organization_id: t.organizationId } })
    await prisma.usage.create({ data: { organization_id: t.organizationId, workspace_id: ws.id, user_id: t.userId, feature: "vision.analyze", cost_credit: credit, status: "COMPLETED", created_at: at } })
  }

  it("lọc theo tháng; kèm hạn mức tháng và credit tặng theo gói; kỳ sai → 400", async () => {
    const period = creditPeriod()
    await use(a, 5, new Date())
    await use(a, 7, new Date(Date.now() - 62 * 86_400_000))
    await use(b, 100, new Date())
    await setMonthlyLimit(a.organizationId, "CREDIT", 500)
    await runInTransaction((tx) => upsertSubscription(tx, a.organizationId, { plan: "PRO", cycle: "MONTHLY", priceVnd: 0, includedCreditsMonthly: 300, actorId: a.userId, now: new Date() }))
    await prisma.subscriptions.update({ where: { organization_id: a.organizationId }, data: { status: "ACTIVE" } })

    const all = (await readJson(await summaryRoute(withSession(URL_, a.token)))) as { credit_used: number; period?: string }
    expect(all.credit_used).toBe(12)
    expect(all.period).toBeUndefined()

    const month = (await readJson(await summaryRoute(withSession(`${URL_}?period=${period}`, a.token)))) as {
      credit_used: number; period: string; monthly_limit: number | null; plan: { code: string; included_credits_monthly: number } | null
    }
    expect(month).toMatchObject({ credit_used: 5, period, monthly_limit: 500, plan: { code: "PRO", included_credits_monthly: 300 } })

    const other = (await readJson(await summaryRoute(withSession(`${URL_}?period=${period}`, b.token)))) as { credit_used: number; plan: unknown }
    expect(other).toMatchObject({ credit_used: 100, plan: null })
    expect((await summaryRoute(withSession(`${URL_}?period=2026-13`, a.token))).status).toBe(400)
  })
})
