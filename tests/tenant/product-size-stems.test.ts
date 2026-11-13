import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { optionId } from "@/modules/products/domain/product-pricing"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { submitPublicCatalogOrder } from "@/modules/greeting-card/use-cases/submit-public-catalog-order"
import { ProductRepository } from "@/modules/products/infra/product-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/** Checklist ALG 2.4 (số cành theo kích cỡ) và 2.8 (khoá ngày) — kiểm qua đơn khách đặt thật trên link. */

const inTenDays = () => new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)
const INPUT = {
  customerName: "Khách", customerPhone: "0987654321", recipientName: "Người nhận", recipientPhone: "0912345678",
  confirmedTerms: true, selectedPromotionId: "promo-free-card", deliveryAddress: "12 Lê Lợi, Quận 1",
}

describe("phiên bản kích cỡ và khoá ngày trên đơn khách đặt", () => {
  let a: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function setup(blocked: string[] = []) {
    const product = await new ProductRepository().create(a.ctx, {
      code: "P-SIZE", name: "Bó hồng",
      attributes: {
        pricing: {
          mode: "RANGE",
          dimensions: [{ key: "SIZE", label: "Kích cỡ", values: ["Nhỏ", "Lớn"] }],
          rows: [{ values: ["Nhỏ"], price_vnd: 300000, stem_count: 10 }, { values: ["Lớn"], price_vnd: 900000, stem_count: 50 }],
        },
      },
    })
    if (blocked.length > 0) {
      await prisma.products.update({ where: { id: product.id }, data: { availability_config: { mode: "STOCK_QUANTITY", maxQuantity: null, manualBlockedDates: blocked } } })
    }
    const catalog = await new GreetingCardRepository().createCatalog(a.ctx, { code: "bo-size", name: "Bộ", productIds: [product.id], createdBy: a.userId })
    return { product, catalog }
  }

  it("khách chọn size Lớn → dòng đơn ghi phiên bản và 50 cành cho phiếu thợ", async () => {
    const { product, catalog } = await setup()
    await submitPublicCatalogOrder(catalog.id, { ...INPUT, deliveryDate: inTenDays(), productId: product.id, variantId: optionId(["Lớn"]) })
    const item = await prisma.order_items.findFirstOrThrow({ where: { organization_id: a.organizationId, product_id: product.id } })
    expect((item.metadata as { variant: unknown }).variant).toMatchObject({ name: "Lớn", stemCount: 50 })
    expect(Number(item.unit_price_vnd)).toBe(900000)
  })

  it("ngày giao đã khoá cho mẫu → đơn bị từ chối, ngày khác vẫn đặt được", async () => {
    const blockedDay = inTenDays()
    const { product, catalog } = await setup([blockedDay])
    await expect(submitPublicCatalogOrder(catalog.id, { ...INPUT, deliveryDate: blockedDay, productId: product.id, variantId: optionId(["Nhỏ"]) }))
      .rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    const nextDay = new Date(Date.parse(`${blockedDay}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)
    await expect(submitPublicCatalogOrder(catalog.id, { ...INPUT, deliveryDate: nextDay, productId: product.id, variantId: optionId(["Nhỏ"]) }))
      .resolves.toBeTruthy()
  })
})
