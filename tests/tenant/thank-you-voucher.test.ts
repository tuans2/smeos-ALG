import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { quotePublicCatalog, submitPublicCatalogOrder } from "@/modules/greeting-card/use-cases/submit-public-catalog-order"
import { getBrochureTracking } from "@/modules/greeting-card/use-cases/get-brochure-tracking"

/**
 * ALG 5.15 — màn cảm ơn: đơn hoàn tất → đúng một mã giảm giá dùng một lần gắn khách đặt;
 * mã dùng được ở đơn sau của chính khách đó, khách khác bị từ chối; người chưa xác minh không thấy mã.
 */
const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)
const ORDER = {
  customerName: "Khách Quen", customerPhone: "0987654321", recipientName: "Người Nhận", recipientPhone: "0912345678",
  confirmedTerms: true, selectedPromotionId: "promo-free-card", // ưu đãi tặng kèm — không đổi số tiền bài này kiểm
  deliveryDate: day(10), deliveryAddress: "1 Lê Lợi, Q1",
}

describe("mã cảm ơn sau đơn hoàn tất", () => {
  let a: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("camon-a")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function completedOrder(settings: Record<string, unknown>) {
    await prisma.organizations.update({ where: { id: a.organizationId }, data: { settings: { brochure_shipping: { voucher_enabled: true }, ...settings } } })
    const product = await new ProductRepository().create(a.ctx, { code: "HOA-1", name: "Bó hồng", attributes: { price: 500_000 } })
    const catalog = await new GreetingCardRepository().createCatalog(a.ctx, { code: "bst", name: "Bộ", productIds: [product.id], createdBy: a.userId })
    const order = await submitPublicCatalogOrder(catalog.id, { ...ORDER, productId: product.id })
    await prisma.orders.update({ where: { id: order.orderId }, data: { status: "COMPLETED", delivery_status: "DELIVERED" } })
    return { product, catalog, order }
  }

  it("phát đúng một mã cho người đặt đã xác minh; mở lại vẫn mã đó; chưa xác minh không thấy", async () => {
    const { order } = await completedOrder({ greetingCardThankYou: { enabled: true, percent: 15 } })
    const proof = { phoneLast4: "4321" }
    const first = await getBrochureTracking(order.orderCode, proof)
    const voucher = first.status === "FOUND" ? first.order.thankYouVoucher : null
    expect(voucher).toMatchObject({ percent: 15, used: false })
    expect(voucher?.code).toMatch(/^CAMON-/)
    const again = await Promise.all([getBrochureTracking(order.orderCode, proof), getBrochureTracking(order.orderCode, proof)])
    for (const r of again) expect(r.status === "FOUND" && r.order.thankYouVoucher?.code).toBe(voucher?.code)
    expect(await prisma.vouchers.count({ where: { organization_id: a.organizationId } })).toBe(1)
    const row = await prisma.vouchers.findFirstOrThrow({ where: { organization_id: a.organizationId } })
    expect(row).toMatchObject({ usage_limit: 1, per_customer_limit: 1 })
    expect(row.customer_id).not.toBeNull()

    const anonymous = await getBrochureTracking(order.orderCode)
    expect(anonymous.status === "FOUND" && anonymous.order.thankYouVoucher).toBeNull()
  })

  it("mã dùng được ở đơn sau của chính khách; khách khác bị từ chối", async () => {
    const { product, catalog, order } = await completedOrder({ greetingCardThankYou: { enabled: true, percent: 10 } })
    const tracking = await getBrochureTracking(order.orderCode, { phoneLast4: "4321" })
    const code = tracking.status === "FOUND" ? tracking.order.thankYouVoucher?.code : undefined
    expect(code).toBeTruthy()

    const mine = await quotePublicCatalog(catalog.id, product.id, { deliveryDate: day(12), voucherCode: code, customerPhone: ORDER.customerPhone })
    expect(mine.errors.voucherCode).toBeUndefined()
    expect(mine.quote.discountVnd).toBe(50_000)
    const other = await quotePublicCatalog(catalog.id, product.id, { deliveryDate: day(12), voucherCode: code, customerPhone: "0900000001" })
    expect(other.errors.voucherCode).toBeTruthy()
  })

  it("tiệm chưa bật → không phát mã", async () => {
    const { order } = await completedOrder({})
    const tracking = await getBrochureTracking(order.orderCode, { phoneLast4: "4321" })
    expect(tracking.status === "FOUND" && tracking.order.thankYouVoucher).toBeNull()
    expect(await prisma.vouchers.count({ where: { organization_id: a.organizationId } })).toBe(0)
  })
})
