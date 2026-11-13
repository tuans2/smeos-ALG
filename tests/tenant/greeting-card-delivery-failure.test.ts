import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { TenantContext } from "@/core/tenancy"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { dispatchBrochureShipping, markBrochureDeliveryFailed } from "@/modules/greeting-card/use-cases/update-brochure-order-status"
import { submitOrderChange } from "@/modules/greeting-card/use-cases/order-change"
import { getBrochureTracking } from "@/modules/greeting-card/use-cases/get-brochure-tracking"

/** Giao không thành công / hẹn giao lại (08/10/2026): thứ tự tác vụ, phí giao lại, khách đổi giờ, cách ly. */

const DATE = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)
const ORDER = {
  customerName: "Khách Quen", customerPhone: "0987654321", recipientName: "Người Nhận", recipientPhone: "0912345678",
  confirmedTerms: true, selectedPromotionId: "promo-free-card", // ưu đãi tặng kèm — không đổi số tiền bài này kiểm
  deliveryDate: DATE, deliveryTimeSlot: "08:00 - 10:00", deliveryAddress: "1 Lê Lợi, Q1", cardMessage: "Chúc mừng",
}
const PROOF = { phoneLast4: "4321" }

async function codeOf(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p
    return undefined
  } catch (err) {
    return (err as { code?: string }).code
  }
}

describe("greeting-card: giao không thành công", () => {
  let a: Tenant
  let b: Tenant
  let staffA: TenantContext
  let staffB: TenantContext

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    staffA = { ...a.ctx, capabilities: new Set(["R1", "R2", "R3", "R4", "R5", "R9", "F2"]) }
    staffB = { ...b.ctx, capabilities: new Set(["R1", "R2", "R3", "R4", "R5", "R9", "F2"]) }
    await prisma.organizations.update({
      where: { id: a.organizationId },
      data: { settings: { brochure_shipping: { zones: [], redelivery_fee_vnd: 30000 } } },
    })
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function deliveringOrder() {
    const product = await new ProductRepository().create(a.ctx, { code: "HOA-G", name: "Bó G", attributes: { price: 500000 } })
    const catalog = await new GreetingCardRepository().createCatalog(a.ctx, { code: "bo-g", name: "Bộ G", productIds: [product.id], createdBy: a.userId })
    const link = await createSendLink(staffA, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, product.id)
    const order = await submitBrochureOrder(link.sendCode, ORDER)
    await prisma.orders.update({ where: { id: order.orderId }, data: { production_status: "READY", delivery_status: "DELIVERING", status: "PROCESSING" } })
    return order
  }

  it("ghi giao hỏng có phí → FAILED, cộng phí, lưu lịch sử; tổ chức khác 404; chưa giao thì 409", async () => {
    const order = await deliveringOrder()
    expect(await codeOf(markBrochureDeliveryFailed(staffB, order.orderId, { reason: "NO_ANSWER" }))).toBe("NOT_FOUND")
    expect(await codeOf(markBrochureDeliveryFailed(staffA, order.orderId, { reason: "OTHER", note: "" }))).toBe("VALIDATION_FAILED")

    const r = await markBrochureDeliveryFailed(staffA, order.orderId, { reason: "NO_ANSWER", note: "Gọi 3 lần", chargeFee: true })
    expect(r).toMatchObject({ feeVnd: 30000, totalVnd: 530000 })
    const row = await prisma.orders.findUniqueOrThrow({ where: { id: order.orderId } })
    expect(row.delivery_status).toBe("FAILED")
    expect(Number(row.balance_vnd)).toBe(530000)
    expect(row.delivery_window).toMatchObject({ date: DATE, failures: [{ reason: "NO_ANSWER", feeVnd: 30000 }] })
    expect(await codeOf(markBrochureDeliveryFailed(staffA, order.orderId, { reason: "NO_ANSWER" }))).toBe("CONFLICT")

    const anon = await getBrochureTracking(order.orderCode)
    expect(anon.status === "FOUND" && anon.order.deliveryFailure).toMatchObject({ reasonLabel: "Người nhận không nghe máy", note: null })
    expect(anon.status === "FOUND" && anon.trackingStep.title).toBe("Giao hàng chưa thành công")
  })


  it("khách đổi được giờ giao sau khi giao hỏng nhưng không đổi lời nhắn thiệp; giao lại không tính phí khi bỏ chọn", async () => {
    const order = await deliveringOrder()
    await markBrochureDeliveryFailed(staffA, order.orderId, { reason: "NOT_HOME", chargeFee: false })
    expect(Number((await prisma.orders.findUniqueOrThrow({ where: { id: order.orderId } })).total_vnd)).toBe(500000)

    expect(await codeOf(submitOrderChange(new Request("http://localhost"), order.orderCode, PROOF, { cardMessage: "Khác" }))).toBe("VALIDATION_FAILED")
    const sent = await submitOrderChange(new Request("http://localhost"), order.orderCode, PROOF, { deliveryTimeSlot: "18:00 - 20:00" })
    expect(sent.status).toBe("PENDING")

    await dispatchBrochureShipping(staffA, order.orderId, { trackingNote: "Giao lại lần 2" })
    const row = await prisma.orders.findUniqueOrThrow({ where: { id: order.orderId } })
    expect(row.delivery_status).toBe("DELIVERING")
    // Giữ lịch sử giao hỏng sau khi giao lại
    expect(row.delivery_window).toMatchObject({ failures: [{ reason: "NOT_HOME", feeVnd: 0 }] })
  })
})
