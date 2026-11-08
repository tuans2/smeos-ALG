import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { holdRewriteCredit } from "@/modules/content-engine/use-cases/rewrite-credit"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/** PO 07/11/2026 (nợ #170): "Viết lại bằng AI" trừ giá `content.rewrite` qua sổ credit thật, hoàn khi không có gợi ý AI. */
describe("credit của rewrite trên CSDL thật", () => {
  let a: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("rewrite-credit")
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  async function workspace(kind: "PRODUCTION" | "EXPERIENCE", credit: number) {
    const ws = await prisma.workspaces.create({ data: { organization_id: a.organizationId, name: kind, kind } })
    await prisma.organizations.update({ where: { id: a.organizationId }, data: { credit_balance: credit } })
    return { ...a.ctx, workspaceId: ws.id }
  }
  const balance = async () => Number((await prisma.organizations.findUniqueOrThrow({ where: { id: a.organizationId } })).credit_balance)

  it("giữ 1 credit, hoàn lại đủ khi release", async () => {
    const ctx = await workspace("PRODUCTION", 5)
    const held = await holdRewriteCredit(ctx)
    expect(await balance()).toBe(4)
    await held.release()
    expect(await balance()).toBe(5)
  })

  it("số dư 0 → QUOTA_EXCEEDED, số dư không đổi", async () => {
    const ctx = await workspace("PRODUCTION", 0)
    await expect(holdRewriteCredit(ctx)).rejects.toMatchObject({ code: "QUOTA_EXCEEDED" })
    expect(await balance()).toBe(0)
  })

  it("không gian trải nghiệm → không trừ", async () => {
    const ctx = await workspace("EXPERIENCE", 0)
    const held = await holdRewriteCredit(ctx)
    expect(held.cost).toBe(0)
    expect(await balance()).toBe(0)
  })
})
