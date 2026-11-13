import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { quoteBrochureSession, submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { quotePublicCatalog, submitPublicCatalogOrder } from "@/modules/greeting-card/use-cases/submit-public-catalog-order"

/** Đặt hoa có size, số lượng, khu vực giao, mã giảm giá (vouchers) — giá tính ở server. */

function inTenDays(): string {
  return new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)
}

const BASE_INPUT = {
  customerName: "Khách",
  customerPhone: "0987654321",
  recipientName: "Người nhận",
  recipientPhone: "0912345678",
  confirmedTerms: true, selectedPromotionId: "promo-free-card", // ưu đãi tặng kèm — không đổi số tiền bài này kiểm
  deliveryAddress: "12 Lê Lợi, Quận 1",
}

async function codeOf(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p
    return undefined
  } catch (err) {
    return (err as { code?: string }).code
  }
}

describe("greeting-card checkout", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function setup(t: Tenant, code: string) {
    const product = await new ProductRepository().create(t.ctx, { code: `P-${code}`, name: "Bó hồng", attributes: { price: 500000 } })
    const variant = await prisma.product_variants.create({
      data: { organization_id: t.organizationId, product_id: product.id, name: "Size L", multiplier: 2 },
    })
    const catalog = await new GreetingCardRepository().createCatalog(t.ctx, {
      code, name: "Bộ", productIds: [product.id], createdBy: t.userId,
    })
    await prisma.organizations.update({
      where: { id: t.organizationId },
      data: { settings: { brochure_shipping: { zones: [{ id: "q1", name: "Quận 1", fee_vnd: 30000 }], voucher_enabled: true } } },
    })
    const link = await createSendLink(t.ctx, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, product.id)
    return { product, variant, catalog, link }
  }

  it("tổng tiền = size × số lượng − mã giảm giá + phí giao; mã bị đánh dấu đã dùng", async () => {
    const { variant, link } = await setup(a, "tong")
    const v = await prisma.vouchers.create({
      data: { organization_id: a.organizationId, code: "FLORA10", discount_value: 10, max_discount_vnd: 150000 },
    })

    const quoted = await quoteBrochureSession(link.sendCode, {
      variantId: variant.id, quantity: 2, shippingZoneId: "q1", voucherCode: "flora10", selectedPromotionId: "promo-free-card",
    })
    expect(quoted.errors).toEqual({})
    expect(quoted.quote).toMatchObject({ subtotalVnd: 2_000_000, discountVnd: 150000, shippingFeeVnd: 30000, totalVnd: 1_880_000 })

    const order = await submitBrochureOrder(link.sendCode, {
      ...BASE_INPUT, deliveryDate: inTenDays(), variantId: variant.id, quantity: 2, shippingZoneId: "q1", voucherCode: "FLORA10",
    })
    expect(order.totalVnd).toBe(1_880_000)
    const row = await prisma.orders.findUniqueOrThrow({ where: { id: order.orderId }, include: { items: true } })
    expect(Number(row.total_vnd)).toBe(1_880_000)
    expect(row.voucher_id).toBe(v.id)
    expect(row.items[0]).toMatchObject({ quantity: 2 })
    expect(Number(row.items[0]?.unit_price_vnd)).toBe(1_000_000)
    expect((await prisma.vouchers.findUniqueOrThrow({ where: { id: v.id } })).is_used).toBe(true)
  })

  it("bắt chọn khu vực khi tiệm có khai khu vực; mã đã dùng/của tiệm khác bị từ chối", async () => {
    const { link } = await setup(a, "loi")
    expect(await codeOf(submitBrochureOrder(link.sendCode, { ...BASE_INPUT, deliveryDate: inTenDays() }))).toBe("VALIDATION_FAILED")

    await prisma.vouchers.create({ data: { organization_id: b.organizationId, code: "CUAB", discount_value: 50 } })
    const foreign = await quoteBrochureSession(link.sendCode, { shippingZoneId: "q1", voucherCode: "CUAB" })
    expect(foreign.errors.voucherCode).toBe("Mã giảm giá không tồn tại")

    await prisma.vouchers.create({ data: { organization_id: a.organizationId, code: "DADUNG", discount_value: 5, is_used: true } })
    const used = await quoteBrochureSession(link.sendCode, { shippingZoneId: "q1", voucherCode: "DADUNG" })
    expect(used.errors.voucherCode).toMatch(/hết lượt sử dụng/)
    expect(
      await codeOf(submitBrochureOrder(link.sendCode, { ...BASE_INPUT, deliveryDate: inTenDays(), shippingZoneId: "q1", voucherCode: "DADUNG" }))
    ).toBe("VALIDATION_FAILED")
    expect(await prisma.orders.count({ where: { organization_id: a.organizationId } })).toBe(0)
  })

  it("link bộ sưu tập công khai: báo giá + đặt đơn, sai khu vực không để lại phiên mồ côi", async () => {
    const { product, variant, catalog } = await setup(a, "cong-khai")
    const before = await prisma.greeting_sessions.count({ where: { organization_id: a.organizationId } })
    expect(
      await codeOf(submitPublicCatalogOrder(catalog.id, { ...BASE_INPUT, deliveryDate: inTenDays(), productId: product.id, shippingZoneId: "khong-co" }))
    ).toBe("VALIDATION_FAILED")
    expect(await prisma.greeting_sessions.count({ where: { organization_id: a.organizationId } })).toBe(before)

    const q = await quotePublicCatalog(catalog.id, product.id, { variantId: variant.id, shippingZoneId: "q1", selectedPromotionId: "promo-free-card" })
    expect(q.quote.totalVnd).toBe(1_030_000)
    const order = await submitPublicCatalogOrder(catalog.id, {
      ...BASE_INPUT, deliveryDate: inTenDays(), productId: product.id, variantId: variant.id, shippingZoneId: "q1",
    })
    expect(order.totalVnd).toBe(1_030_000)
  })
})
