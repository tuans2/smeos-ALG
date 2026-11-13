import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { prisma } from "@/core/tenancy/infra/prisma"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { quotePublicCatalog, submitPublicCatalogOrder } from "@/modules/greeting-card/use-cases/submit-public-catalog-order"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { getPricingRules } from "@/modules/products/use-cases/get-pricing-rules"
import { putPricingRules } from "@/modules/products/use-cases/put-pricing-rules"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/** Checklist ALG 3.1 — chiết khấu theo hạng khách (nhận diện qua SĐT) và phụ phí giờ cao điểm ở báo giá. */

const DAY = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10)
const PHONE = "0987654321"

describe("chiết khấu hạng khách và giờ cao điểm", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    for (const t of [a, b]) {
      await prisma.customers.create({ data: { organization_id: t.organizationId, code: "KH-0001", name: "Khách quen", phone: PHONE, tier: "VIP" } })
    }
    await putPricingRules(a.ctx, { key: "customer_tier_discount", value: { VIP: 0.1, GOLD: 0.05 }, branchId: null })
    await putPricingRules(a.ctx, { key: "peak_hour_surcharge", value: [{ startHour: 17, endHour: 19, vnd: 30_000 }], branchId: null })
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function catalogOf(t: Tenant) {
    const product = await new ProductRepository().create(t.ctx, { code: "BO-1", name: "Bó mẫu", attributes: { price: 500_000 } })
    const catalog = await new GreetingCardRepository().createCatalog(t.ctx, { code: `bo-${t.organizationId.slice(0, 6)}`, name: "Bộ", productIds: [product.id], createdBy: t.userId })
    return { product, catalog }
  }

  it("khách VIP được giảm 10% thành dòng riêng; giao 17h–19h cộng phụ phí", async () => {
    const { product, catalog } = await catalogOf(a)
    const r = await quotePublicCatalog(catalog.id, product.id, { deliveryDate: DAY, selectedPromotionId: "promo-free-card", customerPhone: PHONE, deliveryTimeSlot: "18:00 - 20:00" })
    expect(r.quote).toMatchObject({ subtotalVnd: 500_000, tierDiscountVnd: 50_000, tierLabel: "Ưu đãi khách hạng VIP", peakHourSurchargeVnd: 30_000 })
    expect(r.quote.totalVnd).toBe(500_000 - 50_000 + r.quote.shippingFeeVnd + 30_000 - (r.quote.promotionDiscountVnd ?? 0))

    const plain = await quotePublicCatalog(catalog.id, product.id, { deliveryDate: DAY, selectedPromotionId: "promo-free-card", customerPhone: "0911111111", deliveryTimeSlot: "08:00 - 10:00" })
    expect(plain.quote.tierDiscountVnd).toBeUndefined()
    expect(plain.quote.peakHourSurchargeVnd).toBeUndefined()
  })

  it("đơn đặt lưu đúng tổng đã giảm hạng và cộng giờ cao điểm", async () => {
    const { product, catalog } = await catalogOf(a)
    const req = { deliveryDate: DAY, selectedPromotionId: "promo-free-card", customerPhone: PHONE, deliveryTimeSlot: "18:00 - 20:00" }
    const quoted = await quotePublicCatalog(catalog.id, product.id, req)
    await submitPublicCatalogOrder(catalog.id, {
      ...req, productId: product.id, customerName: "Khách quen", recipientName: "Người nhận", recipientPhone: "0912345678",
      confirmedTerms: true, deliveryAddress: "1 Lê Lợi, Q1",
    })
    const order = await prisma.orders.findFirstOrThrow({ where: { organization_id: a.organizationId } })
    expect(Number(order.total_vnd)).toBe(quoted.quote.totalVnd)
  })

  it("quy tắc của tổ chức này không áp sang tổ chức khác dù cùng SĐT, cùng hạng", async () => {
    const { product, catalog } = await catalogOf(b)
    const r = await quotePublicCatalog(catalog.id, product.id, { deliveryDate: DAY, selectedPromotionId: "promo-free-card", customerPhone: PHONE, deliveryTimeSlot: "18:00 - 20:00" })
    expect(r.quote.tierDiscountVnd).toBeUndefined()
    expect(r.quote.peakHourSurchargeVnd).toBeUndefined()
    expect((await getPricingRules(b.ctx)).customer_tier_discount.VIP).toBe(0)
    expect((await getPricingRules(a.ctx)).peak_hour_surcharge).toHaveLength(1)
  })

  it("giá trị vượt trần bị từ chối khi lưu", async () => {
    await expect(putPricingRules(a.ctx, { key: "customer_tier_discount", value: { VIP: 0.8 }, branchId: null })).rejects.toThrow()
  })
})
