import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import { flushBackground } from "@/core/runtime/background"
import { BrochurePaymentRepository } from "@/modules/greeting-card/infra/brochure-payment-repository"
import { DismissalRepository } from "@/modules/greeting-card/infra/dismissal-repository"
import { DismissalRestoreRepository } from "@/modules/greeting-card/infra/dismissal-restore-repository"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { requestDiscount } from "@/modules/greeting-card/use-cases/discount-requests"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"

/**
 * Thẻ chào (PO 07/11/2026 bỏ đóng băng): đơn Thẻ chào trừ tồn sản phẩm theo dõi số lượng như đơn cổng chung (Q9),
 * huỷ / bỏ hiển thị thì hoàn, khôi phục thì trừ lại; giảm giá tay của Điều hành vào trần chung 50% tiền hàng.
 */
const ORDER = {
  customerName: "Khách", customerPhone: "0987654321", recipientName: "Người nhận", recipientPhone: "0912345678",
  confirmedTerms: true, selectedPromotionId: "promo-free-card", deliveryAddress: "12 Lê Lợi, Quận 1",
  deliveryDate: new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10),
}

async function codeOf(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p
    return undefined
  } catch (err) {
    return (err as { code?: string }).code
  }
}

describe("Thẻ chào — tồn kho và trần giảm giá chung", () => {
  let a: Tenant
  let productId: string
  let catalogId: string

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    productId = (await new ProductRepository().create(a.ctx, { code: "HOA-1", name: "Bó hồng", attributes: { price: 1_000_000 } })).id
    catalogId = (await new GreetingCardRepository().createCatalog(a.ctx, { code: "bo-1", name: "Bộ 1", productIds: [productId], createdBy: a.userId })).id
  })

  afterAll(async () => {
    await flushBackground()
    await disconnectDatabase()
  })

  async function place(quantity: number, extra: Record<string, unknown> = {}) {
    const link = await createSendLink(a.ctx, { catalogId })
    await selectBrochureProduct(link.sendCode, productId)
    return submitBrochureOrder(link.sendCode, { ...ORDER, quantity, ...extra })
  }
  const stock = async () => (await prisma.product_inventory.findFirstOrThrow({ where: { product_id: productId } })).quantity_available

  it("đặt trừ tồn, thiếu hàng → 409 không tạo đơn; huỷ hoàn đúng một lần", async () => {
    const branchId = (await prisma.branches.create({ data: { organization_id: a.organizationId, name: "Quận 1", code: "Q1" } })).id
    await prisma.product_inventory.create({ data: { organization_id: a.organizationId, product_id: productId, branch_id: branchId, quantity_available: 3 } })
    const first = await place(2)
    expect(await stock()).toBe(1)
    expect(await codeOf(place(2))).toBe("CONFLICT")
    expect(await stock()).toBe(1)
    expect(await prisma.orders.count({ where: { organization_id: a.organizationId } })).toBe(1)

    const repo = new BrochurePaymentRepository()
    await repo.cancel(a.ctx, first.orderId, "Khách đổi ý")
    expect(await stock()).toBe(3)
    expect(await codeOf(repo.cancel(a.ctx, first.orderId, "Lần nữa"))).toBeDefined()
    expect(await stock()).toBe(3)
  })

  it("bỏ hiển thị hoàn tồn; khôi phục trừ lại, hết hàng thì không khôi phục", async () => {
    const branchId = (await prisma.branches.create({ data: { organization_id: a.organizationId, name: "Quận 1", code: "Q1" } })).id
    await prisma.product_inventory.create({ data: { organization_id: a.organizationId, product_id: productId, branch_id: branchId, quantity_available: 2 } })
    const { orderId } = await place(2)
    expect(await stock()).toBe(0)
    const dismissal = new DismissalRepository()
    await dismissal.propose(a.ctx, { id: orderId, type: "ORDER", reasonId: "CHANGED_MIND", reasonText: "Khách đổi ý không mua nữa" }, false)
    await dismissal.decide(a.ctx, { id: orderId, type: "ORDER", approve: true })
    expect(await stock()).toBe(2)

    await prisma.product_inventory.updateMany({ where: { product_id: productId }, data: { quantity_available: 1 } })
    expect(await codeOf(new DismissalRestoreRepository().restore(a.ctx, { id: orderId, type: "ORDER" }))).toBe("CONFLICT")
    expect((await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("CANCELLED")

    await prisma.product_inventory.updateMany({ where: { product_id: productId }, data: { quantity_available: 5 } })
    await new DismissalRestoreRepository().restore(a.ctx, { id: orderId, type: "ORDER" })
    expect(await stock()).toBe(3)
  })

  it("sản phẩm không theo dõi tồn → đặt bình thường, không đụng kho", async () => {
    await place(4)
    expect(await prisma.product_inventory.count()).toBe(0)
  })

  it("giảm tay + mã giảm giá đã áp không quá 50% tiền hàng", async () => {
    await prisma.vouchers.create({ data: { organization_id: a.organizationId, code: "GIAM30", discount_value: 30, max_discount_vnd: 300_000 } })
    await prisma.organizations.update({ where: { id: a.organizationId }, data: { settings: { brochure_shipping: { voucher_enabled: true } } } })
    const { orderId } = await place(1, { voucherCode: "GIAM30" })
    const row = await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })
    expect(row.pricing_rule_ref).toMatchObject({ subtotalVnd: 1_000_000, discountVnd: 300_000 })
    // Tổng đơn 700.000đ: trần riêng 50% cho phép 350.000đ, nhưng trần chung chỉ còn 500.000 − 300.000 = 200.000đ
    expect(await codeOf(requestDiscount(a.ctx, { orderId, ask: { amountVnd: 250_000 }, reason: "Khách quen" }))).toBe("VALIDATION_FAILED")
    expect((await requestDiscount(a.ctx, { orderId, ask: { amountVnd: 200_000 }, reason: "Khách quen" })).id).toBeTruthy()
  })
})
