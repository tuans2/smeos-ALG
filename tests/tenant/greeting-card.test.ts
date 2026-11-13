import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { adminConfirmBrochurePayment } from "@/modules/greeting-card/use-cases/confirm-brochure-payment"

function inTenDays(): string {
  return new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)
}

// Bảng phủ: greeting_catalogs, greeting_catalog_products (gắn sản phẩm), greeting_sessions,
// greeting_journey_events (ghi theo phiên) — xem thêm greeting-card-*.test.ts
describe("greeting-card tenant isolation", () => {
  let tenantA: Tenant
  let tenantB: Tenant
  let repo: GreetingCardRepository

  beforeEach(async () => {
    await resetDatabase()
    tenantA = await createTenant("alpha")
    tenantB = await createTenant("beta")
    repo = new GreetingCardRepository()
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("tenant A cannot see tenant B's greeting catalogs", async () => {
    await repo.createCatalog(tenantA.ctx, {
      code: "catalog-a",
      name: "Catalog A",
      createdBy: tenantA.userId,
    })

    await repo.createCatalog(tenantB.ctx, {
      code: "catalog-b",
      name: "Catalog B",
      createdBy: tenantB.userId,
    })

    const catalogsA = await repo.listCatalogs(tenantA.ctx)
    const catalogsB = await repo.listCatalogs(tenantB.ctx)

    expect(catalogsA).toHaveLength(1)
    expect(catalogsA[0]?.code).toBe("catalog-a")
    expect(catalogsB).toHaveLength(1)
    expect(catalogsB[0]?.code).toBe("catalog-b")
  })

  it("tenant A cannot see tenant B's greeting sessions", async () => {
    const catA = await repo.createCatalog(tenantA.ctx, {
      code: "20-10-a",
      name: "20/10 Shop A",
      createdBy: tenantA.userId,
    })
    const catB = await repo.createCatalog(tenantB.ctx, {
      code: "20-10-b",
      name: "20/10 Shop B",
      createdBy: tenantB.userId,
    })

    await createSendLink(tenantA.ctx, {
      catalogId: catA.id,
      customerName: "Khách A",
      prefix: "T01",
    })

    await createSendLink(tenantB.ctx, {
      catalogId: catB.id,
      customerName: "Khách B",
      prefix: "T02",
    })

    const sessionsA = await repo.listSessions(tenantA.ctx, { limit: 20 })
    const sessionsB = await repo.listSessions(tenantB.ctx, { limit: 20 })

    expect(sessionsA).toHaveLength(1)
    expect(sessionsA[0]?.customer_name).toBe("Khách A")
    expect(sessionsB).toHaveLength(1)
    expect(sessionsB[0]?.customer_name).toBe("Khách B")
  })

  it("tenant A cannot confirm payment for tenant B's brochure order", async () => {
    const prodRepo = new ProductRepository()
    const productB = await prodRepo.create(tenantB.ctx, {
      code: "HOA-B-01",
      name: "Bó Hoa Hồng B",
      attributes: { price: 750000 },
    })

    const catB = await repo.createCatalog(tenantB.ctx, {
      code: "8-3-b",
      name: "8/3 Shop B",
      productIds: [productB.id],
      createdBy: tenantB.userId,
    })

    const linkB = await createSendLink(tenantB.ctx, {
      catalogId: catB.id,
      customerName: "Khách B",
    })

    await selectBrochureProduct(linkB.sendCode, productB.id)
    const orderResult = await submitBrochureOrder(linkB.sendCode, {
      customerName: "Khách B",
      customerPhone: "0987654321",
      recipientName: "Người nhận B",
      recipientPhone: "0912345678",
      confirmedTerms: true, selectedPromotionId: "promo-discount-10",
      deliveryDate: inTenDays(),
      deliveryAddress: "123 Đường B, Quận 1, TP.HCM",
    })

    // Tenant A tries to confirm payment of Tenant B's order
    await expect(
      adminConfirmBrochurePayment(tenantA.ctx, orderResult.orderId)
    ).rejects.toMatchObject({ code: "NOT_FOUND" })

    // Tenant B confirms payment successfully
    const confirmed = await adminConfirmBrochurePayment(tenantB.ctx, orderResult.orderId)
    expect(confirmed.status).toBe("CONFIRMED")
    expect(confirmed.paidVnd).toBe(orderResult.totalVnd)
    expect(confirmed.balanceVnd).toBe(0)
  })
})
