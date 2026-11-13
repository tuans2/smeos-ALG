import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as getCredits, POST as postCredits } from "@/app/api/v1/platform/organizations/[id]/credits/route"
import { PUT as putUsageLimit } from "@/app/api/v1/platform/organizations/[id]/usage-limit/route"
import { GET as getPricing, PUT as putPricing } from "@/app/api/v1/platform/credit-pricing/route"
import { OrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { PlatformOperatorRepository } from "@/modules/platform/infra/platform-operator-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1/platform/organizations"
const params = (id: string) => ({ params: Promise.resolve({ id }) })

/** Checklist ALG 10.6 — sổ cái credit: số dư = tổng giao dịch; Console nạp/tặng/hoàn có lý do; thiếu mã → 403. */
describe("sổ cái credit", () => {
  let a: Tenant
  let b: Tenant
  let op: Tenant
  let reader: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("credit-a")
    b = await createTenant("credit-b")
    op = await createTenant("credit-op")
    reader = await createTenant("credit-reader")
    await new PlatformOperatorRepository().grant(op.userId, ["N1", "N3"], null)
    await new PlatformOperatorRepository().grant(reader.userId, ["N1"], null)
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  const sumOf = async (orgId: string) =>
    (await prisma.credit_transactions.aggregate({ where: { organization_id: orgId }, _sum: { amount: true } }))._sum.amount ?? 0
  const balanceOf = async (orgId: string) =>
    (await prisma.organizations.findUniqueOrThrow({ where: { id: orgId } })).credit_balance

  it("nạp, tặng, hoàn và trừ khi dùng đều vào sổ; số dư bằng tổng các dòng; tổ chức khác không đổi", async () => {
    const bBefore = await balanceOf(b.organizationId)
    for (const [kind, amount] of [["TOPUP", 500], ["GIFT", 50], ["REFUND", 7]] as const) {
      const res = await postCredits(
        withSession(`${BASE}/${a.organizationId}/credits`, op.token, { method: "POST", body: JSON.stringify({ kind, amount, reason: "Thử nghiệm sổ cái" }) }),
        params(a.organizationId),
      )
      expect(res.status).toBe(200)
    }
    const repo = new OrganizationRepository()
    expect(await repo.tryDeductCredit(a.ctx, 30, { service: "AI", reason: "vision.analyze" })).toBe(true)
    expect(await repo.tryDeductCredit(a.ctx, 10_000_000)).toBe(false)

    expect(await sumOf(a.organizationId)).toBe(await balanceOf(a.organizationId))
    const usage = await prisma.credit_transactions.findFirstOrThrow({ where: { organization_id: a.organizationId, kind: "USAGE" } })
    expect(usage).toMatchObject({ amount: -30, service: "AI", actor_id: a.userId })
    expect(await balanceOf(b.organizationId)).toBe(bBefore)

    const audit = await prisma.platform_audit_logs.count({ where: { entity_id: a.organizationId, user_id: op.userId, action: { startsWith: "platform.credit." } } })
    expect(audit).toBe(3)

    const list = (await readJson(await getCredits(withSession(`${BASE}/${a.organizationId}/credits`, reader.token), params(a.organizationId)))) as {
      data: { balance: number; entries: Array<{ kind: string }> }
    }
    expect(list.data.balance).toBe(await balanceOf(a.organizationId))
    expect(list.data.entries[0]?.kind).toBe("USAGE")
  })

  it("thiếu N3 → 403; tài khoản thường → 403; thiếu lý do hoặc số không hợp lệ → 400; tổ chức không có → 404", async () => {
    const body = (x: object) => ({ method: "POST", body: JSON.stringify({ kind: "TOPUP", amount: 10, reason: "Nạp thử", ...x }) })
    expect((await postCredits(withSession(`${BASE}/${a.organizationId}/credits`, reader.token, body({})), params(a.organizationId))).status).toBe(403)
    expect((await postCredits(withSession(`${BASE}/${a.organizationId}/credits`, a.token, body({})), params(a.organizationId))).status).toBe(403)
    expect((await postCredits(withSession(`${BASE}/${a.organizationId}/credits`, op.token, body({ reason: "x" })), params(a.organizationId))).status).toBe(400)
    expect((await postCredits(withSession(`${BASE}/${a.organizationId}/credits`, op.token, body({ amount: -5 })), params(a.organizationId))).status).toBe(400)
    expect((await postCredits(withSession(`${BASE}/khong-co/credits`, op.token, body({})), params("khong-co"))).status).toBe(404)
  })

  it("hạn mức tháng và quy đổi credit (10.3): N3 mới sửa được, có nhật ký; giá trị sai → 400", async () => {
    const startedAt = new Date()
    const put = (token: string, body: unknown) =>
      putUsageLimit(withSession(`${BASE}/${a.organizationId}/usage-limit`, token, { method: "PUT", body: JSON.stringify(body) }), params(a.organizationId))
    expect((await put(reader.token, { monthlyLimit: 500 })).status).toBe(403)
    expect((await put(op.token, { monthlyLimit: -1 })).status).toBe(400)
    expect((await put(op.token, { monthlyLimit: 500 })).status).toBe(200)
    const list = (await readJson(await getCredits(withSession(`${BASE}/${a.organizationId}/credits`, reader.token), params(a.organizationId)))) as {
      data: { monthly: { credit: { limit: number | null } } }
    }
    expect(list.data.monthly.credit.limit).toBe(500)

    const PRICING = "http://localhost/api/v1/platform/credit-pricing"
    try {
      expect((await getPricing(withSession(PRICING, reader.token))).status).toBe(403)
      expect((await putPricing(withSession(PRICING, op.token, { method: "PUT", body: JSON.stringify({ smsCredit: 1.5 }) }))).status).toBe(400)
      const ok = await putPricing(withSession(PRICING, op.token, { method: "PUT", body: JSON.stringify({ smsCredit: 2, defaultMonthlyLimit: 1000 }) }))
      expect(ok.status).toBe(200)
      expect(((await readJson(ok)) as { data: { smsCredit: number; znsCredit: number } }).data).toMatchObject({ smsCredit: 2, znsCredit: 0 })
      expect(await prisma.platform_audit_logs.count({
        where: { user_id: op.userId, created_at: { gte: startedAt }, action: { in: ["platform.usage_limit.set", "platform.credit_pricing.update"] } },
      })).toBe(2)
    } finally {
      await prisma.platform_settings.deleteMany({ where: { key: "credit_pricing" } })
    }
  })
})
