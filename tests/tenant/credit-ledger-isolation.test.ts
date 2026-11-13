import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { prisma } from "@/core/tenancy/infra/prisma"
import { OrganizationRepository } from "@/modules/organization/infra/organization-repository"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/** Checklist ALG 10.6 — `credit_transactions`: trừ/hoàn theo phiên chỉ ghi sổ của chính tổ chức trong phiên. */
describe("cách ly sổ cái credit", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("ledger-a")
    b = await createTenant("ledger-b")
    await new OrganizationRepository().topUpCredit(a.organizationId, 100, "TOPUP", { reason: "Nạp thử" })
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("tạo tài khoản ghi khoản tặng khởi tạo; trừ/hoàn của A không chạm sổ và số dư của B", async () => {
    const opening = await prisma.credit_transactions.findMany({ where: { organization_id: b.organizationId } })
    const bBalance = (await prisma.organizations.findUniqueOrThrow({ where: { id: b.organizationId } })).credit_balance
    expect(opening.reduce((s, r) => s + r.amount, 0)).toBe(bBalance)

    const repo = new OrganizationRepository()
    expect(await repo.tryDeductCredit(a.ctx, 40, { service: "AI", reason: "vision.analyze" })).toBe(true)
    await repo.refundCredit(a.ctx, 15, { service: "AI", reason: "job hỏng" })

    const rowsB = await prisma.credit_transactions.findMany({ where: { organization_id: b.organizationId } })
    expect(rowsB).toHaveLength(opening.length)
    expect((await prisma.organizations.findUniqueOrThrow({ where: { id: b.organizationId } })).credit_balance).toBe(bBalance)

    const rowsA = await prisma.credit_transactions.findMany({ where: { organization_id: a.organizationId }, orderBy: { created_at: "asc" } })
    const balanceA = (await prisma.organizations.findUniqueOrThrow({ where: { id: a.organizationId } })).credit_balance
    expect(rowsA.reduce((s, r) => s + r.amount, 0)).toBe(balanceA)
    expect(rowsA.at(-1)).toMatchObject({ kind: "REFUND", amount: 15, balance_after: balanceA })
  })
})
