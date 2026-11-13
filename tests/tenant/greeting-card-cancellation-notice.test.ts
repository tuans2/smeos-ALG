import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { TenantContext } from "@/core/tenancy"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { CancellationRepository } from "@/modules/greeting-card/infra/cancellation-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { coordinatorRejectBrochureOrder } from "@/modules/greeting-card/use-cases/update-brochure-order-status"
import { getBrochureTracking } from "@/modules/greeting-card/use-cases/get-brochure-tracking"
import { getInbox } from "@/modules/greeting-card/use-cases/get-inbox"

/** Điều phối huỷ đơn đã duyệt → khách thấy thông báo, Sale phụ trách nhận tin nhắc liên hệ (PO 16/10/2026). */

const DATE = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)
const ORDER = {
  customerName: "Khách Quen", customerPhone: "0987654321", recipientName: "Người Nhận", recipientPhone: "0912345678",
  confirmedTerms: true, selectedPromotionId: "promo-free-card", deliveryDate: DATE, deliveryTimeSlot: "08:00 - 10:00", deliveryAddress: "1 Lê Lợi, Q1",
}

describe("greeting-card: thông báo huỷ cho khách + nhắc Sale", () => {
  let a: Tenant
  let b: Tenant
  let sale: TenantContext
  const cancellations = new CancellationRepository()

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    sale = { ...a.ctx, capabilities: new Set(["R1", "R2", "R3", "R9"]) }
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function placeOrder() {
    const x = await new ProductRepository().create(a.ctx, { code: "HOA-X", name: "Bó X", attributes: { price: 500000 } })
    const catalog = await new GreetingCardRepository().createCatalog(a.ctx, { code: "bo-x", name: "Bộ X", productIds: [x.id], createdBy: a.userId })
    const link = await createSendLink(sale, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, x.id)
    const order = await submitBrochureOrder(link.sendCode, ORDER)
    return { ...order, sendCode: link.sendCode }
  }

  const reminders = (orderId: string) =>
    prisma.greeting_messages.findMany({ where: { order_id: orderId, sender_id: "system:cancellation-notice" } })

  it("đã thu tiền: khách thấy hạn 2 tiếng + số hoàn; Sale phụ trách nhận tin nhắc; tổ chức khác không thấy", async () => {
    const order = await placeOrder()
    await prisma.orders.update({ where: { id: order.orderId }, data: { status: "CONFIRMED", paid_vnd: 250_000, balance_vnd: 250_000 } })
    const { proposalId } = await coordinatorRejectBrochureOrder(a.ctx, order.orderId, { reason: "Hết hoa hồng" })
    await cancellations.decide(a.ctx, { requestId: proposalId, approve: true, note: "" })

    const t = await getBrochureTracking(order.orderCode, { sendCode: order.sendCode })
    if (t.status !== "FOUND") throw new Error("không thấy đơn")
    const n = t.order.cancellationNotice
    expect(n).toMatchObject({ refundVnd: 250_000, refundToConfirm: false })
    expect(new Date(n!.contactDeadline).getTime() - new Date(n!.cancelledAt).getTime()).toBe(2 * 60 * 60 * 1000)

    const msgs = await reminders(order.orderId)
    expect(msgs).toHaveLength(1)
    expect(msgs[0]).toMatchObject({ organization_id: a.organizationId, to_user_id: a.userId, to_role: null })
    expect(msgs[0]!.body).toMatch(/Điều phối huỷ.*hoàn 250\.000đ.*tối đa 2 tiếng/)
    expect(await prisma.greeting_messages.count({ where: { organization_id: b.organizationId } })).toBe(0)

    // Hộp việc của Sale: tin chưa đọc từ "Hệ thống", tính vào số trên nút chuông
    const inbox = await getInbox(sale)
    const thread = inbox.threads.find((th) => th.orderId === order.orderId)
    expect(thread).toMatchObject({ lastSender: "Hệ thống", unread: 1 })
    expect(inbox.counts.unreadMessages).toBeGreaterThanOrEqual(1)
  })

  it("khách đã báo chuyển khoản, tiệm chưa ghi nhận tiền: vẫn hứa hoàn tiền; Sale được nhắc kiểm khoản đã chuyển", async () => {
    const order = await placeOrder()
    await prisma.greeting_sessions.updateMany({ where: { send_code: order.sendCode }, data: { status: "PAYMENT_REPORTED" } })
    const { proposalId } = await coordinatorRejectBrochureOrder(a.ctx, order.orderId, { reason: "Quá tải" })
    await cancellations.decide(a.ctx, { requestId: proposalId, approve: true, note: "" })

    const t = await getBrochureTracking(order.orderCode, { sendCode: order.sendCode })
    if (t.status !== "FOUND") throw new Error("không thấy đơn")
    expect(t.order.cancellationNotice).toMatchObject({ refundVnd: 0, refundToConfirm: true })
    expect((await reminders(order.orderId))[0]!.body).toMatch(/kiểm tra khoản khách đã chuyển/)
  })

  it("Sale đề xuất huỷ, hoặc Điều hành từ chối đề xuất: không thông báo khách, không nhắc Sale", async () => {
    const bySale = await placeOrder()
    const p1 = await cancellations.createProposal(a.ctx, { orderId: bySale.orderId, senderRole: "SALE", proposal: { type: "CANCEL_ONLY", reason: "Khách đổi ý", refundAmountVnd: 0 } })
    await cancellations.decide(a.ctx, { requestId: p1.id, approve: true, note: "" })
    const t = await getBrochureTracking(bySale.orderCode, { sendCode: bySale.sendCode })
    expect(t.status === "FOUND" && t.order.cancellationNotice).toBeNull()
    expect(await reminders(bySale.orderId)).toHaveLength(0)

    await resetDatabase()
    a = await createTenant("alpha")
    sale = { ...a.ctx, capabilities: new Set(["R1", "R2", "R3", "R9"]) }
    const rejected = await placeOrder()
    const { proposalId } = await coordinatorRejectBrochureOrder(a.ctx, rejected.orderId, { reason: "Quá tải" })
    await cancellations.decide(a.ctx, { requestId: proposalId, approve: false, note: "Vẫn làm được" })
    expect(await reminders(rejected.orderId)).toHaveLength(0)
  })
})
