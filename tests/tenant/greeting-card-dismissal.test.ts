import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import { flushBackground } from "@/core/runtime/background"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { DismissalRepository } from "@/modules/greeting-card/infra/dismissal-repository"
import { DismissalRestoreRepository } from "@/modules/greeting-card/infra/dismissal-restore-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { runBackgroundSweep } from "@/modules/greeting-card/use-cases/background-sweep"

/**
 * Bỏ hiển thị đơn chưa thanh toán: đề xuất quá 5 phút phải được tự duyệt THẬT trong DB (có lịch sử),
 * đơn khách vừa trả tiền không bị huỷ nhầm, khôi phục chỉ áp cho đơn đã bỏ hiển thị, khác tiệm → 404.
 */
const ORDER = {
  customerName: "Khách Quen", customerPhone: "0987654321", recipientName: "Người Nhận", recipientPhone: "0912345678",
  confirmedTerms: true, selectedPromotionId: "promo-discount-10", deliveryDate: new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10), deliveryAddress: "1 Lê Lợi, Q1",
}
const REASON = { type: "ORDER" as const, reasonId: "CHANGED_MIND", reasonText: "Khách đổi ý không mua nữa" }

describe("greeting-card: bỏ hiển thị đơn chưa thanh toán", () => {
  let a: Tenant
  let b: Tenant
  const repo = new DismissalRepository()

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
  })

  afterAll(async () => {
    await flushBackground()
    await disconnectDatabase()
  })

  async function draftOrder(t: Tenant) {
    const product = await new ProductRepository().create(t.ctx, { code: "HOA-1", name: "Bó 1", attributes: { price: 500_000 } })
    const catalog = await new GreetingCardRepository().createCatalog(t.ctx, { code: "bo-1", name: "Bộ 1", productIds: [product.id], createdBy: t.userId })
    const link = await createSendLink(t.ctx, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, product.id)
    return (await submitBrochureOrder(link.sendCode, ORDER)).orderId
  }

  it("đề xuất quá hạn → bộ quét tự huỷ đơn, ghi lịch sử; khôi phục trả về trạng thái cũ", async () => {
    const orderId = await draftOrder(a)
    const before = (await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })).status
    await repo.propose(a.ctx, { id: orderId, ...REASON }, false)
    await expect(repo.propose(a.ctx, { id: orderId, ...REASON }, false)).rejects.toMatchObject({ code: "CONFLICT" })
    await expect(repo.decide(b.ctx, { id: orderId, type: "ORDER", approve: true })).rejects.toMatchObject({ code: "NOT_FOUND" })

    const ref = (await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })).pricing_rule_ref as Record<string, Record<string, unknown>>
    await prisma.orders.update({ where: { id: orderId }, data: { pricing_rule_ref: { ...ref, dismissal: { ...ref.dismissal, proposedAt: new Date(Date.now() - 10 * 60_000).toISOString() } } } })

    expect((await runBackgroundSweep()).dismissed).toBe(1)
    expect((await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("CANCELLED")
    const events = await prisma.order_events.findMany({ where: { order_id: orderId, to_value: "CANCELLED" } })
    expect(events[0]?.reason).toMatch(/Hệ thống tự duyệt/)

    await expect(new DismissalRestoreRepository().restore(b.ctx, { id: orderId, type: "ORDER" })).rejects.toMatchObject({ code: "NOT_FOUND" })
    await new DismissalRestoreRepository().restore(a.ctx, { id: orderId, type: "ORDER" })
    expect((await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })).status).toBe(before)
  })

  it("khách trả tiền sau khi Sale đề xuất → duyệt bị từ chối, đơn không bị huỷ", async () => {
    const orderId = await draftOrder(a)
    await repo.propose(a.ctx, { id: orderId, ...REASON }, false)
    await prisma.orders.update({ where: { id: orderId }, data: { paid_vnd: 100_000, balance_vnd: { decrement: 100_000 } } }) // giữ balance = total − paid (CHECK orders_money_check)
    await expect(repo.decide(a.ctx, { id: orderId, type: "ORDER", approve: true })).rejects.toMatchObject({ code: "CONFLICT" })
    expect((await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })).status).not.toBe("CANCELLED")
  })

  it("không khôi phục được đơn huỷ theo quy trình khác", async () => {
    const orderId = await draftOrder(a)
    await prisma.orders.update({ where: { id: orderId }, data: { status: "CANCELLED" } })
    await expect(new DismissalRestoreRepository().restore(a.ctx, { id: orderId, type: "ORDER" })).rejects.toMatchObject({ code: "CONFLICT" })
  })
})
