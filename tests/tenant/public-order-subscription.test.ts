import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { prisma } from "@/core/tenancy/infra/prisma"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { submitPublicCatalogOrder } from "@/modules/greeting-card/use-cases/submit-public-catalog-order"
import { runInTransaction } from "@/modules/organization/infra/transaction"
import { upsertSubscription } from "@/modules/subscription/infra/subscription-repository"
import { PUBLIC_ORDERS_PAUSED_MESSAGE } from "@/modules/subscription/use-cases/public-order-guard"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * PO 05/11/2026: gói dịch vụ của cửa hàng quá hạn thanh toán → link công khai không nhận đơn, khách thấy câu
 * trung tính (không nhắc thuê bao); cửa hàng khác không bị ảnh hưởng; thanh toán xong nhận đơn lại ngay.
 */
const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)
const ORDER = {
  customerName: "Khách Quen", customerPhone: "0987654321", recipientName: "Người Nhận", recipientPhone: "0912345678",
  confirmedTerms: true, selectedPromotionId: "promo-free-card", deliveryDate: day(10), deliveryAddress: "1 Lê Lợi, Q1",
}

describe("đơn công khai khi gói dịch vụ quá hạn", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("pub-sub-a")
    b = await createTenant("pub-sub-b")
  })
  afterAll(async () => disconnectDatabase())

  async function catalogOf(t: Tenant) {
    const product = await new ProductRepository().create(t.ctx, { code: "HOA-1", name: "Bó hồng", attributes: { price: 500_000 } })
    const catalog = await new GreetingCardRepository().createCatalog(t.ctx, { code: "bst", name: "Bộ", productIds: [product.id], createdBy: t.userId })
    return { product, catalog }
  }

  it("quá hạn → không tạo đơn, câu báo trung tính; tiệm khác vẫn nhận; thanh toán xong nhận lại", async () => {
    await runInTransaction((tx) => upsertSubscription(tx, a.organizationId, { plan: "PRO", cycle: "MONTHLY", priceVnd: 500_000, includedCreditsMonthly: 0, actorId: a.userId, now: new Date() }))
    const shopA = await catalogOf(a)
    const shopB = await catalogOf(b)

    await expect(submitPublicCatalogOrder(shopA.catalog.id, { ...ORDER, productId: shopA.product.id }))
      .rejects.toMatchObject({ code: "SUBSCRIPTION_OVERDUE", message: PUBLIC_ORDERS_PAUSED_MESSAGE })
    expect(PUBLIC_ORDERS_PAUSED_MESSAGE).not.toMatch(/gói|hoá đơn|thanh toán/i)
    expect(await prisma.orders.count({ where: { organization_id: a.organizationId } })).toBe(0)
    expect(await prisma.customers.count({ where: { organization_id: a.organizationId } })).toBe(0)

    expect((await submitPublicCatalogOrder(shopB.catalog.id, { ...ORDER, productId: shopB.product.id })).orderCode).toBeTruthy()

    await prisma.subscription_invoices.updateMany({ where: { organization_id: a.organizationId }, data: { status: "PAID", paid_at: new Date() } })
    expect((await submitPublicCatalogOrder(shopA.catalog.id, { ...ORDER, productId: shopA.product.id })).orderCode).toBeTruthy()
  })
})
