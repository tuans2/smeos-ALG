import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { prisma } from "@/core/tenancy/infra/prisma"
import type { TenantContext } from "@/core/tenancy"
import { flushBackground } from "@/core/runtime/background"
import { OrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { setMonthlyLimit } from "@/modules/usage/infra/usage-limit-repository"
import { getMonthlyLimits, setAiMonthlyLimit } from "@/modules/usage/use-cases/monthly-limits"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * Checklist ALG 10.3, 9.7, 10.5 — `usage_limits`: hạn mức credit tháng (Console đặt) và trần AI (cửa hàng đặt)
 * chặn ngay khi trừ, không trừ số dư khi bị chặn; báo một lần ở 80% và khi sắp hết; tổ chức khác không bị ảnh hưởng.
 */
describe("hạn mức credit tháng", () => {
  let a: Tenant
  let b: Tenant
  const can = (t: Tenant, codes: string[]): TenantContext => ({ ...t.ctx, capabilities: new Set(codes) })
  const balance = async (t: Tenant) => (await prisma.organizations.findUniqueOrThrow({ where: { id: t.organizationId } })).credit_balance
  const inbox = async (t: Tenant, eventKey: string) => {
    await flushBackground()
    return prisma.notification_inbox.count({ where: { organization_id: t.organizationId, event_key: eventKey } })
  }

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("limit-a")
    b = await createTenant("limit-b")
    for (const t of [a, b]) await new OrganizationRepository().topUpCredit(t.organizationId, 100, "TOPUP", { reason: "Nạp thử" })
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("chạm hạn mức credit tháng → 422 QUOTA_EXCEEDED, số dư giữ nguyên; báo 80% đúng một lần; B không bị chặn", async () => {
    await setMonthlyLimit(a.organizationId, "CREDIT", 10)
    const repo = new OrganizationRepository()
    expect(await repo.tryDeductCredit(a.ctx, 8, { service: "AI" })).toBe(true)
    expect(await repo.tryDeductCredit(a.ctx, 1, { service: "CHAT" })).toBe(true)
    const before = await balance(a)
    await expect(repo.tryDeductCredit(a.ctx, 3, { service: "AI" })).rejects.toMatchObject({ code: "QUOTA_EXCEEDED" })
    expect(await balance(a)).toBe(before)
    expect(await inbox(a, "USAGE_LIMIT_NEAR")).toBeGreaterThan(0)
    const nearCount = await inbox(a, "USAGE_LIMIT_NEAR")
    expect(await repo.tryDeductCredit(a.ctx, 1, { service: "CHAT" })).toBe(true)
    expect(await inbox(a, "USAGE_LIMIT_NEAR")).toBe(nearCount)

    expect(await repo.tryDeductCredit(b.ctx, 30, { service: "AI" })).toBe(true)
    expect((await getMonthlyLimits(can(a, ["G8"]))).credit).toMatchObject({ used: 10, limit: 10 })
    expect((await getMonthlyLimits(can(b, ["G8"]))).credit).toMatchObject({ used: 30, limit: null })
  })

  it("trần AI do Điều hành đặt chỉ chặn phần AI; thiếu U2 không đặt được; hoàn credit trả lại hạn mức", async () => {
    await expect(setAiMonthlyLimit(can(a, ["G8"]), 5)).rejects.toMatchObject({ code: "CAPABILITY_DENIED" })
    await setAiMonthlyLimit(can(a, ["U2", "G8"]), 5)
    const repo = new OrganizationRepository()
    await expect(repo.tryDeductCredit(a.ctx, 6, { service: "AI" })).rejects.toMatchObject({ code: "QUOTA_EXCEEDED" })
    expect(await repo.tryDeductCredit(a.ctx, 6, { service: "CHAT" })).toBe(true)
    expect(await repo.tryDeductCredit(a.ctx, 5, { service: "AI" })).toBe(true)
    await repo.refundCredit(a.ctx, 5, { service: "AI", reason: "job hỏng" })
    expect((await getMonthlyLimits(can(a, ["G8"]))).ai).toMatchObject({ used: 0, limit: 5 })
    expect(await repo.tryDeductCredit(a.ctx, 5, { service: "AI" })).toBe(true)
    expect(await prisma.usage_limits.count({ where: { organization_id: b.organizationId, service: "AI" } })).toBe(0)
  })

  it("số dư xuống dưới 20% lần nạp gần nhất → báo sắp hết đúng một lần trong tháng", async () => {
    const repo = new OrganizationRepository()
    const start = await balance(a)
    expect(await repo.tryDeductCredit(a.ctx, start - 15, { service: "AI" })).toBe(true)
    expect(await inbox(a, "CREDIT_LOW")).toBeGreaterThan(0)
    const lowCount = await inbox(a, "CREDIT_LOW")
    expect(await repo.tryDeductCredit(a.ctx, 5, { service: "AI" })).toBe(true)
    expect(await inbox(a, "CREDIT_LOW")).toBe(lowCount)
    expect(await inbox(b, "CREDIT_LOW")).toBe(0)
  })
})
