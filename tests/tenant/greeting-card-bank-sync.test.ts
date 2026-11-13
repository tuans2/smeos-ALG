import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { markPaymentEventHandled, rotatePaymentWebhookKey } from "@/modules/greeting-card/use-cases/payment-webhook"
import { POST as sepayPOST } from "@/app/api/v1/public/payments/sepay/route"

/** Webhook SePay → greeting_payment_events + greeting_integrations: tự ghi thu, chống trùng, cách ly tiệm. */

const inTenDays = () => new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)

function hook(key: string | null, body: Record<string, unknown>) {
  return sepayPOST(
    new Request("http://x/api/v1/public/payments/sepay", {
      method: "POST",
      headers: { "content-type": "application/json", ...(key ? { authorization: `Apikey ${key}` } : {}) },
      body: JSON.stringify({ transferType: "in", accountNumber: "0011223344", transactionDate: "2026-10-05 10:00:00", ...body }),
    })
  )
}

describe("greeting-card bank sync (SePay)", () => {
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

  async function orderFor(t: Tenant, price: number) {
    const product = await new ProductRepository().create(t.ctx, { code: `P${price}`, name: "Bó hồng", attributes: { price } })
    const catalog = await new GreetingCardRepository().createCatalog(t.ctx, { code: `c${price}`, name: "C", productIds: [product.id], createdBy: t.userId })
    const link = await createSendLink(t.ctx, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, product.id)
    return submitBrochureOrder(link.sendCode, {
      customerName: "K", customerPhone: "0987654321", recipientName: "N", recipientPhone: "0912345678",
      confirmedTerms: true, selectedPromotionId: "promo-free-card", // ưu đãi tặng kèm — không đổi số tiền bài này kiểm
      deliveryDate: inTenDays(), deliveryAddress: "12 Lê Lợi, Q1",
    })
  }

  it("từ chối khoá sai/thiếu (401); khoá đúng tự ghi thu theo mã đơn trong nội dung", async () => {
    const order = await orderFor(a, 500000)
    const { apiKey } = await rotatePaymentWebhookKey(a.ctx)
    expect((await hook(null, { id: 1, transferAmount: 500000, content: order.orderCode })).status).toBe(401)
    expect((await hook("brk_sai", { id: 1, transferAmount: 500000, content: order.orderCode })).status).toBe(401)

    const content = `MBVCB.123.${order.orderCode.replace("-", "").toLowerCase()}.CT`
    const res = await hook(apiKey, { id: 1001, transferAmount: 500000, content })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ success: true, status: "MATCHED" })
    const row = await prisma.orders.findUniqueOrThrow({ where: { id: order.orderId } })
    expect(row.status).toBe("CONFIRMED")
    expect(Number(row.balance_vnd)).toBe(0)

    // SePay gửi lại cùng giao dịch → không ghi thu lần hai
    expect(await (await hook(apiKey, { id: 1001, transferAmount: 500000, content })).json()).toMatchObject({ duplicate: true })
    expect(await prisma.order_payments.count({ where: { order_id: order.orderId } })).toBe(1)
  })

  it("xử lý tiếp giao dịch còn kẹt ở RECEIVED (lần trước chết giữa chừng)", async () => {
    const order = await orderFor(a, 400000)
    const { apiKey } = await rotatePaymentWebhookKey(a.ctx)
    await prisma.greeting_payment_events.create({
      data: { organization_id: a.organizationId, provider: "SEPAY", external_id: "77", amount_vnd: 400000, content: order.orderCode, status: "RECEIVED" },
    })
    expect(await (await hook(apiKey, { id: 77, transferAmount: 400000, content: order.orderCode })).json()).toMatchObject({ status: "MATCHED" })
    expect(await prisma.order_payments.count({ where: { order_id: order.orderId } })).toBe(1)
  })

  it("chuyển thừa ghi đúng phần còn lại; không khớp/đơn tiệm khác vào hàng chờ xử lý tay", async () => {
    const order = await orderFor(a, 300000)
    const orderB = await orderFor(b, 300000)
    const { apiKey } = await rotatePaymentWebhookKey(a.ctx)

    expect(await (await hook(apiKey, { id: 1, transferAmount: 350000, content: order.orderCode })).json()).toMatchObject({ status: "MATCHED" })
    const ev = await prisma.greeting_payment_events.findFirstOrThrow({ where: { external_id: "1" } })
    expect(ev.note).toMatch(/thừa 50/)
    expect(Number((await prisma.orders.findUniqueOrThrow({ where: { id: order.orderId } })).paid_vnd)).toBe(300000)

    // Mã đơn của tiệm B trong webhook của tiệm A → không được ghi vào đơn B
    expect(await (await hook(apiKey, { id: 2, transferAmount: 300000, content: orderB.orderCode })).json()).toMatchObject({ status: "UNMATCHED" })
    expect(Number((await prisma.orders.findUniqueOrThrow({ where: { id: orderB.orderId } })).paid_vnd)).toBe(0)
    expect(await (await hook(apiKey, { id: 3, transferAmount: 1, content: "chuyen tien" })).json()).toMatchObject({ status: "UNMATCHED" })
    expect(await (await hook(apiKey, { id: 4, transferAmount: 1, content: order.orderCode, transferType: "out" })).json()).toMatchObject({ status: "IGNORED" })

    const unmatched = await prisma.greeting_payment_events.findFirstOrThrow({ where: { external_id: "3" } })
    await expect(markPaymentEventHandled(b.ctx, unmatched.id, "không phải của tôi")).rejects.toMatchObject({ code: "NOT_FOUND" })
    await markPaymentEventHandled(a.ctx, unmatched.id, "Khách nhầm, đã hoàn")
    expect((await prisma.greeting_payment_events.findUniqueOrThrow({ where: { id: unmatched.id } })).status).toBe("IGNORED")
  })

  it("tạo khoá mới làm khoá cũ hết hiệu lực; greeting_integrations chỉ lưu băm", async () => {
    const first = await rotatePaymentWebhookKey(a.ctx)
    const second = await rotatePaymentWebhookKey(a.ctx)
    expect((await hook(first.apiKey, { id: 9, transferAmount: 1, content: "x" })).status).toBe(401)
    expect((await hook(second.apiKey, { id: 9, transferAmount: 1, content: "x" })).status).toBe(200)
    const row = await prisma.greeting_integrations.findFirstOrThrow({ where: { organization_id: a.organizationId } })
    expect(row.payment_webhook_key_hash).not.toContain(second.apiKey)
    expect(JSON.stringify(row)).not.toContain(second.apiKey)
  })
})
