import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/env", async (orig) => {
  const mod = await orig<typeof import("@/lib/env")>()
  return { ...mod, env: { ...mod.env, SEPAY_PLATFORM_API_KEY: "khoa-thu-nghiem-sepay-nen-tang" } }
})

import { GET as listProducts, POST as createProduct } from "@/app/api/v1/products/route"
import { GET as getMySubscriptionRoute } from "@/app/api/v1/subscription/route"
import { prisma } from "@/core/tenancy/infra/prisma"
import { requireFeatureAccess } from "@/core/entitlements/entitlement-service"
import { checkSubscription } from "@/modules/subscription/use-cases/subscription-guard"
import { handlePlatformSepay } from "@/modules/subscription/use-cases/sepay-platform-webhook"
import { runInTransaction } from "@/modules/organization/infra/transaction"
import { upsertSubscription } from "@/modules/subscription/infra/subscription-repository"
import { creditPeriod } from "@/modules/usage/domain/monthly-limit"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Checklist ALG 10.7, PO Q9/Q10 — `subscriptions`, `subscription_invoices`: hoá đơn tới hạn chưa thu → chỉ xem ngay;
 * SePay khớp mã hoá đơn → mở lại, chống ghi trùng; credit tặng theo gói cấp đầu tháng, phần thừa hết hạn;
 * gói thuê bao quyết định tính năng; tổ chức khác không bị ảnh hưởng.
 */
const BASE = "http://localhost/api/v1"
const KEY = "khoa-thu-nghiem-sepay-nen-tang"

describe("vòng đời thuê bao", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("sub-a")
    b = await createTenant("sub-b")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  const assign = (t: Tenant, extra: Partial<{ plan: string; priceVnd: number; includedCreditsMonthly: number }> = {}) =>
    runInTransaction((tx) => upsertSubscription(tx, t.organizationId, { plan: "PRO", cycle: "MONTHLY", priceVnd: 500_000, includedCreditsMonthly: 0, actorId: t.userId, now: new Date(), ...extra }))
  const write = (t: Tenant, code: string) =>
    createProduct(withSession(`${BASE}/products`, t.token, { method: "POST", body: JSON.stringify({ code, name: "Mẫu", status: "ACTIVE" }) }))

  it("hoá đơn kỳ đầu chưa thu → ghi bị chặn 402, đọc vẫn được; SePay đúng mã và đủ tiền → mở lại; gửi lại không ghi trùng; B không bị chặn", async () => {
    const { firstInvoice } = await assign(a)
    const blocked = await write(a, "SP-1")
    expect(blocked.status).toBe(402)
    expect(((await readJson(blocked)) as { error: { code: string } }).error.code).toBe("SUBSCRIPTION_OVERDUE")
    expect((await listProducts(withSession(`${BASE}/products`, a.token))).status).toBe(200)
    expect((await write(b, "SP-B")).status).toBe(201)

    const mine = (await readJson(await getMySubscriptionRoute(withSession(`${BASE}/subscription`, a.token)))) as { data: { subscription: { status: string }; invoices: Array<{ code: string }> } }
    expect(mine.data.subscription.status).toBe("OVERDUE")
    expect(mine.data.invoices[0]?.code).toBe(firstInvoice!.code)
    const theirs = (await readJson(await getMySubscriptionRoute(withSession(`${BASE}/subscription`, b.token)))) as { data: { subscription: null; invoices: unknown[] } }
    expect(theirs.data).toEqual({ subscription: null, invoices: [] })

    await expect(handlePlatformSepay("sai-khoa", { id: 1, transferType: "in", transferAmount: 500_000, content: firstInvoice!.code })).rejects.toMatchObject({ code: "UNAUTHENTICATED" })
    expect(await handlePlatformSepay(KEY, { id: 2, transferType: "in", transferAmount: 400_000, content: `TT ${firstInvoice!.code}` })).toMatchObject({ matched: false, reason: "amount_short" })
    expect(await handlePlatformSepay(KEY, { id: 3, transferType: "in", transferAmount: 500_000, content: `thanh toan ${firstInvoice!.code.toLowerCase()}` })).toEqual({ matched: true })
    expect(await handlePlatformSepay(KEY, { id: 3, transferType: "in", transferAmount: 500_000, content: firstInvoice!.code })).toMatchObject({ matched: false })
    expect((await write(a, "SP-2")).status).toBe(201)
  })

  it("7 ngày trước hết kỳ sinh hoá đơn gia hạn và nhắc một lần; hết kỳ chưa thu → chỉ xem ngay", async () => {
    const { firstInvoice } = await assign(a)
    await handlePlatformSepay(KEY, { id: 10, transferType: "in", transferAmount: 500_000, content: firstInvoice!.code })
    const sub = await prisma.subscriptions.findUniqueOrThrow({ where: { organization_id: a.organizationId } })
    const soon = new Date(sub.current_period_end.getTime() - 3 * 86_400_000)
    expect(await checkSubscription(a.organizationId, soon)).toEqual({ readOnly: false })
    const renewal = await prisma.subscription_invoices.findFirstOrThrow({ where: { subscription_id: sub.id, status: "PENDING" } })
    expect(renewal.due_at.toISOString()).toBe(sub.current_period_end.toISOString())
    expect(renewal.reminded_7d).toBe(true)
    await checkSubscription(a.organizationId, soon)
    expect(await prisma.subscription_invoices.count({ where: { subscription_id: sub.id } })).toBe(2)

    expect(await checkSubscription(a.organizationId, new Date(sub.current_period_end.getTime() + 60_000))).toEqual({ readOnly: true })
    expect((await prisma.subscriptions.findUniqueOrThrow({ where: { id: sub.id } })).status).toBe("OVERDUE")
  })

  it("credit tặng theo gói cấp mỗi tháng; tháng sau thu hồi phần chưa dùng (PO Q10)", async () => {
    await assign(a, { priceVnd: 0, includedCreditsMonthly: 300 })
    await prisma.subscription_invoices.updateMany({ where: { organization_id: a.organizationId }, data: { status: "PAID", paid_at: new Date() } })
    await prisma.subscriptions.update({ where: { organization_id: a.organizationId }, data: { current_period_end: new Date(Date.now() + 200 * 86_400_000) } })
    const before = (await prisma.organizations.findUniqueOrThrow({ where: { id: a.organizationId } })).credit_balance
    await checkSubscription(a.organizationId)
    expect((await prisma.organizations.findUniqueOrThrow({ where: { id: a.organizationId } })).credit_balance).toBe(before + 300)

    // Tháng này dùng 100 credit → tháng sau thu hồi 200, cấp lại 300
    await prisma.usage_limits.create({ data: { organization_id: a.organizationId, service: "CREDIT", period: creditPeriod(), used: 100 } })
    const nextMonth = new Date(Date.now() + 32 * 86_400_000)
    await checkSubscription(a.organizationId, nextMonth)
    const expire = await prisma.credit_transactions.findFirstOrThrow({ where: { organization_id: a.organizationId, kind: "EXPIRE" } })
    expect(expire.amount).toBe(-200)
    expect((await prisma.organizations.findUniqueOrThrow({ where: { id: a.organizationId } })).credit_balance).toBe(before + 300 - 200 + 300)
    expect(await prisma.credit_transactions.count({ where: { organization_id: b.organizationId, service: "SUBSCRIPTION" } })).toBe(0)
  })

  it("tính năng theo gói đang thuê bao", async () => {
    await assign(a, { plan: "STARTER", priceVnd: 0 })
    const ctx = { ...a.ctx, capabilities: new Set(["G1"]) }
    await expect(requireFeatureAccess(ctx, "G1", "creative.studio")).rejects.toMatchObject({ code: "ENTITLEMENT_REQUIRED" })
    await expect(requireFeatureAccess(ctx, "G1", "orders.basic")).resolves.toBeUndefined()
  })
})
