import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { TenantContext } from "@/core/tenancy"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { deleteGreetingCatalog, restoreGreetingCatalog } from "@/modules/greeting-card/use-cases/delete-greeting-catalog"

async function codeOf(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p
    return undefined
  } catch (err) {
    return (err as { code?: string }).code
  }
}

/** Ẩn/khôi phục bộ sưu tập Thẻ chào: người tạo hoặc L4; cách ly tổ chức; audit cùng transaction. */
describe("greeting-card: ẩn/khôi phục bộ sưu tập", () => {
  let a: Tenant
  let b: Tenant
  let catalogId: string

  const as = (t: Tenant, userId: string, caps: string[]): TenantContext => ({ ...t.ctx, userId, capabilities: new Set(caps) })

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    const catalog = await new GreetingCardRepository().createCatalog(a.ctx, { code: "bst-tet", name: "BST Tết", productIds: [], createdBy: a.userId })
    catalogId = catalog.id
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("người tạo ẩn được và audit_logs ghi greeting_catalog.delete", async () => {
    await deleteGreetingCatalog(as(a, a.userId, ["R2"]), catalogId)
    const row = await prisma.greeting_catalogs.findUnique({ where: { id: catalogId } })
    expect(row?.is_active).toBe(false)
    const audit = await prisma.audit_logs.findMany({ where: { organization_id: a.organizationId, entity_id: catalogId } })
    expect(audit.map((x) => x.action)).toEqual(["greeting_catalog.delete"])
  })

  it("tổ chức khác, kể cả có L4 → 404 và không đổi gì", async () => {
    expect(await codeOf(deleteGreetingCatalog(as(b, b.userId, ["R2", "L4"]), catalogId))).toBe("NOT_FOUND")
    const row = await prisma.greeting_catalogs.findUnique({ where: { id: catalogId } })
    expect(row?.is_active).toBe(true)
    expect(await prisma.audit_logs.count({ where: { entity_id: catalogId } })).toBe(0)
  })

  it("cùng tổ chức, không phải người tạo: R6/R10 không đủ (403); L4 thì được", async () => {
    expect(await codeOf(deleteGreetingCatalog(as(a, "nguoi-khac", ["R2", "R6", "R10", "F2"]), catalogId))).toBe("CAPABILITY_DENIED")
    await deleteGreetingCatalog(as(a, "dieu-hanh", ["L4"]), catalogId)
    await restoreGreetingCatalog(as(a, "dieu-hanh", ["L4"]), catalogId)
    const row = await prisma.greeting_catalogs.findUnique({ where: { id: catalogId } })
    expect(row?.is_active).toBe(true)
    const actions = (await prisma.audit_logs.findMany({ where: { entity_id: catalogId }, orderBy: { created_at: "asc" } })).map((x) => x.action)
    expect(actions).toEqual(["greeting_catalog.delete", "greeting_catalog.restore"])
  })
})
