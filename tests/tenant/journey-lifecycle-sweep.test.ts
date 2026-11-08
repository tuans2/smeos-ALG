import { randomUUID } from "node:crypto"

import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { expireOverdueQuotations } from "@/modules/sales/use-cases/expire-quotations"
import { sweepSubscriptions } from "@/modules/subscription/use-cases/sweep-subscriptions"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * UJ-11 (audit hành trình 06/11/2026, Q2/S1): hết hạn báo giá và vòng đời gói từng chỉ chạy khi có người mở màn
 * hình. Nay chạy trong lượt quét định kỳ, toàn hệ thống, đúng luật cũ.
 */
describe("lượt quét vòng đời báo giá và gói dịch vụ", () => {
  let a: Tenant
  let b: Tenant
  const now = new Date()
  const days = (n: number) => new Date(now.getTime() + n * 86_400_000)

  async function quotation(t: Tenant, status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED", validUntil: Date | null) {
    const row = await prisma.quotations.create({
      data: {
        organization_id: t.organizationId,
        code: `BG-${randomUUID().slice(0, 6)}`,
        public_token: randomUUID(),
        status,
        valid_until: validUntil,
        created_by: t.userId,
      },
    })
    return row.id
  }

  const statusOf = async (id: string) => (await prisma.quotations.findUniqueOrThrow({ where: { id } })).status

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("báo giá nháp/đã gửi quá hạn → EXPIRED ở mọi tổ chức; đã đồng ý, đã từ chối, còn hạn giữ nguyên", async () => {
    const sentA = await quotation(a, "SENT", days(-1))
    const draftB = await quotation(b, "DRAFT", days(-2))
    const accepted = await quotation(a, "ACCEPTED", days(-1))
    const rejected = await quotation(a, "REJECTED", days(-1))
    const valid = await quotation(b, "SENT", days(3))
    const noDate = await quotation(b, "SENT", null)

    expect(await expireOverdueQuotations(now)).toBe(2)

    expect(await statusOf(sentA)).toBe("EXPIRED")
    expect(await statusOf(draftB)).toBe("EXPIRED")
    expect(await statusOf(accepted)).toBe("ACCEPTED")
    expect(await statusOf(rejected)).toBe("REJECTED")
    expect(await statusOf(valid)).toBe("SENT")
    expect(await statusOf(noDate)).toBe("SENT")
    expect(await expireOverdueQuotations(now)).toBe(0)
  })

  it("gói sắp hết kỳ được mở hoá đơn kỳ sau dù tiệm không đăng nhập; gói còn xa hạn không bị đụng", async () => {
    const base = { plan: "STARTER", cycle: "MONTHLY" as const, price_vnd: 300_000, status: "ACTIVE" as const }
    const dueSoon = await prisma.subscriptions.create({
      data: { ...base, organization_id: a.organizationId, current_period_start: days(-27), current_period_end: days(3) },
    })
    const quiet = await prisma.subscriptions.create({
      data: { ...base, organization_id: b.organizationId, current_period_start: days(-5), current_period_end: days(25) },
    })

    const result = await sweepSubscriptions(now)

    expect(result).toEqual({ checked: 1, failed: 0 })
    expect(await prisma.subscription_invoices.count({ where: { subscription_id: dueSoon.id } })).toBe(1)
    expect(await prisma.subscription_invoices.count({ where: { subscription_id: quiet.id } })).toBe(0)

    // Chạy lại không sinh hoá đơn thứ hai
    await sweepSubscriptions(now)
    expect(await prisma.subscription_invoices.count({ where: { subscription_id: dueSoon.id } })).toBe(1)
  })
})
