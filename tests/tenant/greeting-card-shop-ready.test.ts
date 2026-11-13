import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { createShareLink } from "@/modules/greeting-card/use-cases/share-links"

/**
 * PO 08/10/2026 (Q2): máy chủ thật phải sạch — tiệm còn hồ sơ mẫu "Tiệm Hoa Mộc Lan" (tên/SĐT mẫu)
 * thì không gửi được link cho khách; sửa hồ sơ thật là gửi được. Hồ sơ tiệm này không ảnh hưởng tiệm khác.
 */
async function codeOf(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p
    return undefined
  } catch (err) {
    return (err as { code?: string }).code
  }
}

describe("greeting-card: chặn gửi link khi hồ sơ tiệm còn là dữ liệu mẫu", () => {
  let a: Tenant
  let b: Tenant
  let catalogA: string
  let catalogB: string
  const sale = (t: Tenant) => ({ ...t.ctx, capabilities: new Set(["R2"]) })

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    for (const [t, set] of [[a, (id: string) => (catalogA = id)], [b, (id: string) => (catalogB = id)]] as const) {
      const p = await new ProductRepository().create(t.ctx, { code: "HOA-1", name: "Bó 1", attributes: { price: 500_000 } })
      set((await new GreetingCardRepository().createCatalog(t.ctx, { code: "le", name: "20/10", productIds: [p.id], createdBy: t.userId })).id)
    }
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("hồ sơ mẫu → 409 cho link riêng và link bộ sưu tập; tiệm khác không bị ảnh hưởng; sửa hồ sơ là gửi được", async () => {
    await prisma.business_profiles.create({ data: { organization_id: a.organizationId, display_name: "Tiệm Hoa Mộc Lan", phone: "0900 123 456" } })
    expect(await codeOf(createSendLink(sale(a), { catalogId: catalogA }))).toBe("CONFLICT")
    expect(await codeOf(createShareLink(sale(a), { catalogId: catalogA }))).toBe("CONFLICT")
    expect(await codeOf(createSendLink(sale(b), { catalogId: catalogB }))).toBeUndefined()

    await prisma.business_profiles.update({ where: { organization_id: a.organizationId }, data: { display_name: "Hoa Xinh Quận 3", phone: "0912 345 678" } })
    expect(await codeOf(createSendLink(sale(a), { catalogId: catalogA }))).toBeUndefined()
  })
})
