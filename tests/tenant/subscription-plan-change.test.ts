import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/env", async (orig) => {
  const mod = await orig<typeof import("@/lib/env")>()
  return { ...mod, env: { ...mod.env, SEPAY_PLATFORM_API_KEY: "khoa-thu-nghiem-sepay-nen-tang" } }
})

import { prisma } from "@/core/tenancy/infra/prisma"
import { runInTransaction } from "@/modules/organization/infra/transaction"
import { ensureInvoice, upsertSubscription } from "@/modules/subscription/infra/subscription-repository"
import { checkSubscription } from "@/modules/subscription/use-cases/subscription-guard"
import { handlePlatformSepay } from "@/modules/subscription/use-cases/sepay-platform-webhook"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * Audit BL-27, PO 12/11/2026: đổi gói ghi giá mới nhưng hoá đơn kỳ sau đã sinh giữ giá cũ; nâng gói không trả chênh
 * lệch; chuyển dư mất phần dư; kỳ neo vĩnh viễn ngày 28 sau tháng Hai.
 */
const KEY = "khoa-thu-nghiem-sepay-nen-tang"
const DAY = 86_400_000

describe("thuê bao — đổi gói, tiền dư, ngày neo", () => {
  let a: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("goi-a")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  const assign = (priceVnd: number, now: Date, cycle: "MONTHLY" | "YEARLY" = "MONTHLY", plan = "PRO", credits = 0) =>
    runInTransaction((tx) => upsertSubscription(tx, a.organizationId, { plan, cycle, priceVnd, includedCreditsMonthly: credits, actorId: a.userId, now }))
  const sub = () => prisma.subscriptions.findUniqueOrThrow({ where: { organization_id: a.organizationId } })
  const invoices = () => prisma.subscription_invoices.findMany({ where: { organization_id: a.organizationId }, orderBy: { created_at: "asc" } })

  it("nâng gói giữa kỳ → hoá đơn bù chênh lệch phần còn lại, hạn trả cùng ngày gia hạn; hoá đơn kỳ sau theo giá mới", async () => {
    const start = new Date(Date.now() - 15 * DAY)
    const { firstInvoice } = await assign(300_000, start)
    await handlePlatformSepay(KEY, { id: 1, transferType: "in", transferAmount: 300_000, content: firstInvoice!.code })
    const s = await sub()
    await runInTransaction((tx) => ensureInvoice(tx, { ...s, cycle: "MONTHLY" }, s.current_period_end))
    const { prorationInvoice } = await assign(600_000, new Date())
    const total = s.current_period_end.getTime() - s.current_period_start.getTime()
    const left = s.current_period_end.getTime() - Date.now()
    expect(prorationInvoice!.amount_vnd).toBeCloseTo(Math.round((300_000 * left) / total / 1000) * 1000, -3)
    expect(prorationInvoice!.due_at.toISOString()).toBe(s.current_period_end.toISOString())
    const next = (await invoices()).find((i) => i.period_start.getTime() === s.current_period_end.getTime())!
    expect(next.amount_vnd).toBe(600_000)
    // Hạ gói: không lập hoá đơn bù, hoá đơn kỳ sau theo giá mới
    expect((await assign(200_000, new Date())).prorationInvoice).toBeNull()
    expect((await prisma.subscription_invoices.findUniqueOrThrow({ where: { id: next.id } })).amount_vnd).toBe(200_000)
  })

  it("hạ gói: giữ gói, giá, credit tặng tới hết kỳ; sang kỳ mới mới áp; hoá đơn kỳ sau theo gói mới", async () => {
    const start = new Date(Date.now() - 20 * DAY)
    const { firstInvoice } = await assign(600_000, start, "MONTHLY", "PRO", 200)
    await handlePlatformSepay(KEY, { id: 11, transferType: "in", transferAmount: 600_000, content: firstInvoice!.code })
    await assign(300_000, new Date(), "MONTHLY", "STARTER", 50)
    const held = await sub()
    expect({ plan: held.plan, price: held.price_vnd, credits: held.included_credits_monthly }).toEqual({ plan: "PRO", price: 600_000, credits: 200 })
    expect(held.pending_change).toMatchObject({ plan: "STARTER", priceVnd: 300_000, includedCreditsMonthly: 50, effectiveAt: held.current_period_end.toISOString() })
    // Hoá đơn kỳ sau sinh theo gói chờ áp; thu tiền kỳ sau → kỳ dời sang kỳ mới → gói mới có hiệu lực
    const next = await runInTransaction((tx) => ensureInvoice(tx, { ...held, cycle: "MONTHLY" }, held.current_period_end))
    expect(next.amount_vnd).toBe(300_000)
    await handlePlatformSepay(KEY, { id: 12, transferType: "in", transferAmount: 300_000, content: next.code })
    const after = await sub()
    expect({ plan: after.plan, price: after.price_vnd, credits: after.included_credits_monthly, pending: after.pending_change }).toEqual({ plan: "STARTER", price: 300_000, credits: 50, pending: null })
  })

  it("hạ gói chưa thu kỳ sau: hết kỳ thì bộ xét thuê bao vẫn áp gói mới; đổi ý về giá cũ → huỷ thay đổi chờ áp", async () => {
    const start = new Date(Date.now() - 20 * DAY)
    const { firstInvoice } = await assign(600_000, start)
    await handlePlatformSepay(KEY, { id: 21, transferType: "in", transferAmount: 600_000, content: firstInvoice!.code })
    await assign(300_000, new Date(), "MONTHLY", "STARTER")
    await assign(600_000, new Date(), "MONTHLY", "PRO")
    expect((await sub()).pending_change).toBeNull()
    await assign(300_000, new Date(), "MONTHLY", "STARTER")
    const s = await sub()
    await checkSubscription(a.organizationId, new Date(s.current_period_end.getTime() + DAY))
    expect(await sub()).toMatchObject({ plan: "STARTER", price_vnd: 300_000, pending_change: null })
  })

  it("chuyển dư → phần dư trừ vào hoá đơn kỳ kế tiếp; dư đủ cả hoá đơn → hoá đơn đó coi như đã thu", async () => {
    const { firstInvoice } = await assign(300_000, new Date())
    expect(await handlePlatformSepay(KEY, { id: 2, transferType: "in", transferAmount: 400_000, content: firstInvoice!.code })).toEqual({ matched: true })
    const s = await sub()
    const next = (await invoices()).find((i) => i.period_start.getTime() === s.current_period_end.getTime())!
    expect({ amount: next.amount_vnd, status: next.status }).toEqual({ amount: 200_000, status: "PENDING" })
    expect(await handlePlatformSepay(KEY, { id: 3, transferType: "in", transferAmount: 500_000, content: next.code })).toEqual({ matched: true })
    const third = (await invoices()).at(-1)!
    expect({ amount: third.amount_vnd, status: third.status, reference: third.payment_reference }).toEqual({ amount: 0, status: "PAID", reference: `CREDIT-${next.code}` })
  })

  it("ngày neo theo hoá đơn đầu tiên: 31/01 → 28/02 → 31/03", async () => {
    const start = new Date("2026-01-31T03:00:00Z")
    await assign(300_000, start)
    const s = await sub()
    expect(s.current_period_end.toISOString()).toBe("2026-02-28T03:00:00.000Z")
    const second = await runInTransaction((tx) => ensureInvoice(tx, { ...s, cycle: "MONTHLY" }, s.current_period_end))
    expect(second.period_end.toISOString()).toBe("2026-03-31T03:00:00.000Z")
  })
})
