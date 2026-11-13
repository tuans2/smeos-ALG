import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { prisma } from "@/core/tenancy/infra/prisma"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { quotePublicCatalog, submitPublicCatalogOrder } from "@/modules/greeting-card/use-cases/submit-public-catalog-order"
import { ProductRepository } from "@/modules/products/infra/product-repository"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/** PO Q8, checklist ALG 3.6 — giá mẫu đã gồm phí chế tác; ngày lễ cộng phần chênh phí × (hệ số − 1), gộp vào đơn giá. */

const HOLIDAY = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10)
const NORMAL = new Date(Date.now() + 21 * 86_400_000).toISOString().slice(0, 10)
const INPUT = {
  customerName: "Khách", customerPhone: "0987654321", recipientName: "Người nhận", recipientPhone: "0912345678",
  confirmedTerms: true, selectedPromotionId: "promo-free-card", deliveryAddress: "1 Lê Lợi, Q1", deliveryTimeSlot: "08:00 - 10:00",
}

describe("phí chế tác theo kiểu dáng ngày lễ", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    await prisma.organizations.update({
      where: { id: a.organizationId },
      data: { settings: { industry: "FLORAL", brochure_holidays: { days: [{ id: "h", name: "Ngày thử", date: HOLIDAY, max_orders: 50, surcharge_vnd: 0 }] } } },
    })
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function catalogWith(craftStyle: string | null) {
    const product = await new ProductRepository().create(a.ctx, {
      code: `GIO-${craftStyle ?? "KHONG"}`, name: "Giỏ hoa", attributes: { price: 500_000, ...(craftStyle ? { craftStyle } : {}) },
    })
    const catalog = await new GreetingCardRepository().createCatalog(a.ctx, { code: `bo-${craftStyle ?? "khong"}`, name: "Bộ", productIds: [product.id], createdBy: a.userId })
    return { product, catalog }
  }

  it("giỏ hoa (150.000đ phí, hệ số 1,5): ngày lễ đơn giá 575.000đ, ngày thường 500.000đ; đơn lưu tách phí chế tác", async () => {
    const { product, catalog } = await catalogWith("GIO_HOA")
    const holiday = await quotePublicCatalog(catalog.id, product.id, { deliveryDate: HOLIDAY, selectedPromotionId: "promo-free-card" })
    expect(holiday.quote.unitPriceVnd).toBe(575_000)
    expect(holiday.quote.craftFee).toMatchObject({ style: "GIO_HOA", feeVnd: 150_000, multiplier: 1.5, holidayExtraVnd: 75_000 })
    const normal = await quotePublicCatalog(catalog.id, product.id, { deliveryDate: NORMAL, selectedPromotionId: "promo-free-card" })
    expect(normal.quote.unitPriceVnd).toBe(500_000)

    await submitPublicCatalogOrder(catalog.id, { ...INPUT, deliveryDate: HOLIDAY, productId: product.id })
    const order = await prisma.orders.findFirstOrThrow({ where: { organization_id: a.organizationId } })
    expect(Number(order.total_vnd)).toBe(575_000)
    expect((order.pricing_rule_ref as { craftFee?: unknown }).craftFee).toMatchObject({ holidayExtraVnd: 75_000 })
  })

  it("cửa hàng sửa đơn giá và hệ số → áp ngay; mẫu chưa gắn kiểu giữ nguyên giá ngày lễ", async () => {
    await prisma.organizations.update({
      where: { id: a.organizationId },
      data: { settings: { industry: "FLORAL", craft_style_fees: { GIO_HOA: 200_000 }, craft_holiday_multiplier: 2, brochure_holidays: { days: [{ id: "h", name: "Ngày thử", date: HOLIDAY, max_orders: 50 }] } } },
    })
    const styled = await catalogWith("GIO_HOA")
    expect((await quotePublicCatalog(styled.catalog.id, styled.product.id, { deliveryDate: HOLIDAY, selectedPromotionId: "promo-free-card" })).quote.unitPriceVnd).toBe(700_000)
    const plain = await catalogWith(null)
    const q = await quotePublicCatalog(plain.catalog.id, plain.product.id, { deliveryDate: HOLIDAY, selectedPromotionId: "promo-free-card" })
    expect(q.quote.unitPriceVnd).toBe(500_000)
    expect(q.quote.craftFee).toBeUndefined()
    // Cài đặt của tổ chức khác không ảnh hưởng
    expect(b.organizationId).not.toBe(a.organizationId)
  })
})
