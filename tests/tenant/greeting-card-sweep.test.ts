import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import { flushBackground } from "@/core/runtime/background"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { reportCustomerPayment } from "@/modules/greeting-card/use-cases/confirm-brochure-payment"
import { runBackgroundSweep } from "@/modules/greeting-card/use-cases/background-sweep"

/** Bộ quét nền (06/10/2026): tin kẹt được gửi lại có giới hạn; đơn quá hạn giữ được nhắc / tự huỷ. */

const ORDER = {
  customerName: "Khách Quen", customerPhone: "0987654321", recipientName: "Người Nhận", recipientPhone: "0912345678",
  confirmedTerms: true, selectedPromotionId: "promo-discount-10",
  deliveryDate: new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10), deliveryAddress: "1 Lê Lợi, Q1",
}

describe("greeting-card: bộ quét nền", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
  })

  afterAll(async () => {
    await flushBackground()
    await disconnectDatabase()
  })

  async function placeOrder(t: Tenant) {
    const product = await new ProductRepository().create(t.ctx, { code: "HOA-1", name: "Bó 1", attributes: { price: 500_000 } })
    const catalog = await new GreetingCardRepository().createCatalog(t.ctx, { code: "bo-1", name: "Bộ 1", productIds: [product.id], createdBy: t.userId })
    const link = await createSendLink(t.ctx, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, product.id)
    const order = await submitBrochureOrder(link.sendCode, ORDER)
    return { link, order }
  }

  const holdPolicy = (t: Tenant, autoCancel: boolean) =>
    prisma.organizations.update({
      where: { id: t.organizationId },
      data: { settings: { brochure_policy: { hold_minutes: 15, auto_cancel_unpaid: autoCancel, require_payment_proof: false } } },
    })

  const ageOrder = (id: string, minutes: number) =>
    prisma.orders.update({ where: { id }, data: { created_at: new Date(Date.now() - minutes * 60_000) } })

  it("tin kẹt SENDING quá 5 phút chuyển sang FAILED để gửi lại; tin mới không bị đụng", async () => {
    const { order } = await placeOrder(a)
    await flushBackground()
    const old = new Date(Date.now() - 10 * 60_000)
    await prisma.greeting_notifications.create({
      data: { id: randomUUID(), organization_id: a.organizationId, order_id: order.orderId, event_key: "READY", channel: "ESMS", recipient_masked: "84987***321", status: "SENDING", created_at: old, updated_at: old },
    })
    await prisma.greeting_notifications.create({
      data: { id: randomUUID(), organization_id: a.organizationId, order_id: order.orderId, event_key: "DISPATCHED", channel: "ESMS", recipient_masked: "84987***321", status: "SENDING" },
    })
    // `updated_at` tự cập nhật khi tạo — ép lại mốc cũ cho bản ghi kẹt
    await prisma.$executeRaw`UPDATE greeting_notifications SET updated_at = ${old} WHERE event_key = 'READY'`

    const res = await runBackgroundSweep()
    expect(res.staleFailed).toBe(1)
    const rows = await prisma.greeting_notifications.findMany({ where: { order_id: order.orderId }, orderBy: { event_key: "asc" } })
    expect(rows.map((r) => [r.event_key, r.status])).toEqual([["DISPATCHED", "SENDING"], ["READY", "FAILED"]])
  })

  it("quá hạn giữ đơn + 60 phút, tiệm bật tự huỷ, khách chưa báo chuyển → huỷ có audit; tiệm khác không bị đụng", async () => {
    await holdPolicy(a, true)
    await holdPolicy(b, false)
    const mine = await placeOrder(a)
    const other = await placeOrder(b)
    await ageOrder(mine.order.orderId, 120)
    await ageOrder(other.order.orderId, 120)

    const res = await runBackgroundSweep()
    expect(res.cancelled).toBe(1)
    expect((await prisma.orders.findUniqueOrThrow({ where: { id: mine.order.orderId } })).status).toBe("CANCELLED")
    expect((await prisma.orders.findUniqueOrThrow({ where: { id: other.order.orderId } })).status).toBe("DRAFT")
    const audit = await prisma.audit_logs.findFirst({ where: { organization_id: a.organizationId, action: "greeting_card.order.cancel" } })
    expect(audit).not.toBeNull()
  })

  it("khách đã báo chuyển khoản thì không tự huỷ", async () => {
    await holdPolicy(a, true)
    const { link, order } = await placeOrder(a)
    await reportCustomerPayment(link.sendCode)
    await ageOrder(order.orderId, 120)
    expect((await runBackgroundSweep()).cancelled).toBe(0)
    expect((await prisma.orders.findUniqueOrThrow({ where: { id: order.orderId } })).status).toBe("DRAFT")
  })
})
