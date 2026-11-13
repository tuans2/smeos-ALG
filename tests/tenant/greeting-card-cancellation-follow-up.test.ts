import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import { flushBackground } from "@/core/runtime/background"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { CancellationRepository } from "@/modules/greeting-card/infra/cancellation-repository"
import { CancellationFollowUpRepository } from "@/modules/greeting-card/infra/cancellation-follow-up-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { runBackgroundSweep } from "@/modules/greeting-card/use-cases/background-sweep"
import { BrochurePaymentRepository } from "@/modules/greeting-card/infra/brochure-payment-repository"
import { refundBrochureOrder } from "@/modules/greeting-card/use-cases/confirm-brochure-payment"

/**
 * PO 14/10/2026: Điều phối từ chối nhận đơn mà Điều hành không phản hồi kịp hạn → hệ thống tự huỷ,
 * nhưng phải lưu lịch sử, báo Điều hành và đánh dấu riêng đơn còn phải xử lý huỷ/hoàn.
 */
const ORDER = {
  customerName: "Khách Quen", customerPhone: "0987654321", recipientName: "Người Nhận", recipientPhone: "0912345678",
  confirmedTerms: true, selectedPromotionId: "promo-discount-10",
  deliveryDate: new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10), deliveryAddress: "1 Lê Lợi, Q1",
}

describe("greeting-card: tự huỷ đơn khi đề xuất từ chối nhận đơn quá hạn", () => {
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

  async function expiredRejection(t: Tenant) {
    const product = await new ProductRepository().create(t.ctx, { code: "HOA-1", name: "Bó 1", attributes: { price: 500_000 } })
    const catalog = await new GreetingCardRepository().createCatalog(t.ctx, { code: "bo-1", name: "Bộ 1", productIds: [product.id], createdBy: t.userId })
    const link = await createSendLink(t.ctx, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, product.id)
    const order = await submitBrochureOrder(link.sendCode, ORDER)
    const proposal = await new CancellationRepository().createProposal(t.ctx, {
      orderId: order.orderId,
      senderRole: "COORDINATOR",
      proposal: { type: "CANCEL_ONLY", reason: "Xưởng hết hoa hồng đỏ", refundAmountVnd: 0 },
    })
    await prisma.greeting_messages.update({ where: { id: proposal.id }, data: { created_at: new Date(Date.now() - 2 * 86_400_000) } })
    return { orderId: order.orderId, requestId: proposal.id }
  }

  it("huỷ đơn, ghi lịch sử, báo Điều hành và giữ việc chờ xử lý tới khi Điều hành xác nhận", async () => {
    const { orderId, requestId } = await expiredRejection(a)

    expect((await runBackgroundSweep()).cancelled).toBeGreaterThanOrEqual(1)

    const order = await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })
    expect(order.status).toBe("CANCELLED")
    const history = await prisma.order_events.findMany({ where: { order_id: orderId, to_value: "CANCELLED" } })
    expect(history[0]?.reason).toMatch(/Hệ thống tự duyệt/)
    const audit = await prisma.audit_logs.findMany({ where: { organization_id: a.organizationId, action: "order.cancellation.auto_approve" } })
    expect(audit).toHaveLength(1)
    const notice = await prisma.greeting_messages.findMany({ where: { organization_id: a.organizationId, kind: "CANCELLATION_AUTO_APPROVED" } })
    expect(notice).toHaveLength(1)
    expect(notice[0]?.to_role).toBe("ADMIN")

    const repo = new CancellationFollowUpRepository()
    expect((await repo.listPending(a.ctx)).map((r) => r.id)).toEqual([requestId])
    expect(await repo.listPending(b.ctx)).toEqual([])
    await expect(repo.complete(b.ctx, requestId, "")).rejects.toMatchObject({ code: "NOT_FOUND" })

    await repo.complete(a.ctx, requestId, "Đã gọi báo khách")
    expect(await repo.listPending(a.ctx)).toEqual([])
    await expect(repo.complete(a.ctx, requestId, "")).rejects.toMatchObject({ code: "CONFLICT" })
  })

  it("khoản hoàn chờ ở 'Cần hoàn tiền' không ghi được lần nữa bằng nút Hoàn tiền của sổ thu (không hoàn trùng)", async () => {
    const product = await new ProductRepository().create(a.ctx, { code: "HOA-2", name: "Bó 2", attributes: { price: 500_000 } })
    const catalog = await new GreetingCardRepository().createCatalog(a.ctx, { code: "bo-2", name: "Bộ 2", productIds: [product.id], createdBy: a.userId })
    const link = await createSendLink(a.ctx, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, product.id)
    const { orderId } = await submitBrochureOrder(link.sendCode, ORDER)
    const paid = await new BrochurePaymentRepository().recordIncomingPayment(a.ctx, orderId, {
      amountVnd: 200_000, method: "BANK_TRANSFER", reference: "CK-1", note: "Cọc",
    })
    const proposal = await new CancellationRepository().createProposal(a.ctx, {
      orderId, senderRole: "COORDINATOR",
      proposal: { type: "FULL_REFUND", reason: "Xưởng hết hoa", refundAmountVnd: paid.paidVnd },
    })
    await new CancellationRepository().decide(a.ctx, { requestId: proposal.id, approve: true, note: "Đồng ý" })

    const followUps = new CancellationFollowUpRepository()
    expect((await followUps.pendingRefundsByOrder(a.ctx, [orderId])).get(orderId)).toBe(200_000)
    expect((await followUps.pendingRefundsByOrder(b.ctx, [orderId])).size).toBe(0)
    await expect(refundBrochureOrder(a.ctx, orderId, { amountVnd: 200_000, reason: "Hoàn cọc" })).rejects.toMatchObject({ code: "CONFLICT" })

    await followUps.complete(a.ctx, proposal.id, "Đã chuyển trả khách")
    const refunds = await prisma.order_payments.findMany({ where: { order_id: orderId, kind: "REFUND" } })
    expect(refunds.map((p) => Number(p.amount_vnd))).toEqual([200_000])
    expect(Number((await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })).paid_vnd)).toBe(0)
  })
})
