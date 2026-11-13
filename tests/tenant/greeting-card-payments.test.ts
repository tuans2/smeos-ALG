import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { getGreetingCatalogForCustomer } from "@/modules/greeting-card/use-cases/get-greeting-catalog"
import {
  adminConfirmBrochurePayment,
  cancelBrochureOrder,
  refundBrochureOrder,
} from "@/modules/greeting-card/use-cases/confirm-brochure-payment"
import { assignBrochureFlorist, uploadBrochureProductPhoto } from "@/modules/greeting-card/use-cases/update-brochure-order-status"

/** Đặt cọc, thu nốt, chặn xưởng theo chính sách, huỷ đơn (trả mã giảm giá), hoàn tiền — order_payments. */

const inTenDays = () => new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)

async function codeOf(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p
    return undefined
  } catch (err) {
    return (err as { code?: string }).code
  }
}

describe("greeting-card payments", () => {
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

  async function orderFor(t: Tenant, voucherCode?: string) {
    await prisma.organizations.update({
      where: { id: t.organizationId },
      data: {
        settings: {
          brochure_payment: { bank_id: "VCB", account_no: "0011223344", account_name: "TIEM A" },
          brochure_policy: { deposit_percent: 30, require_paid_before_production: true, require_full_before_dispatch: true },
          brochure_shipping: { zones: [], voucher_enabled: true },
        },
      },
    })
    const product = await new ProductRepository().create(t.ctx, { code: "P1", name: "Bó hồng", attributes: { price: 1_000_000 } })
    const catalog = await new GreetingCardRepository().createCatalog(t.ctx, { code: "c", name: "C", productIds: [product.id], createdBy: t.userId })
    const link = await createSendLink(t.ctx, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, product.id)
    const order = await submitBrochureOrder(link.sendCode, {
      customerName: "K", customerPhone: "0987654321", recipientName: "N", recipientPhone: "0912345678",
      confirmedTerms: true, selectedPromotionId: "promo-free-card", // ưu đãi tặng kèm — không đổi số tiền bài này kiểm
      deliveryDate: inTenDays(), deliveryAddress: "12 Lê Lợi, Q1", ...(voucherCode ? { voucherCode } : {}),
    })
    return { link, order }
  }

  it("QR đòi cọc 30%; xác nhận mặc định ghi DEPOSIT; QR kế tiếp đòi phần còn lại; thu nốt ghi BALANCE", async () => {
    const { link, order } = await orderFor(a)
    expect(order.vietQr).toMatchObject({ amount: 300_000, purpose: "DEPOSIT", orderTotalVnd: 1_000_000 })

    expect(await codeOf(assignBrochureFlorist(a.ctx, order.orderId, { floristNote: "x" }))).toBe("CONFLICT")
    const dep = await adminConfirmBrochurePayment(a.ctx, order.orderId)
    expect(dep).toMatchObject({ kind: "DEPOSIT", status: "CONFIRMED", paidVnd: 300_000, balanceVnd: 700_000 })
    await assignBrochureFlorist(a.ctx, order.orderId, { floristNote: "Lan cắm" })

    const view = await getGreetingCatalogForCustomer(link.sendCode)
    expect(view.status === "ACTIVE" && view.payment).toMatchObject({ amount: 700_000, purpose: "BALANCE" })

    // Tiệm bắt thu đủ trước giao: phần còn lại chỉ thu khi hoa đã xong (PO 10/10/2026); tiệm bỏ qua ảnh
    // thành phẩm thì không có ảnh chờ khách duyệt — hoa xong là thu được, không kẹt đơn
    expect(await codeOf(adminConfirmBrochurePayment(a.ctx, order.orderId))).toBe("CONFLICT")
    await uploadBrochureProductPhoto(a.ctx, order.orderId, { skipPhoto: true, skipReason: "test" })

    expect(await codeOf(adminConfirmBrochurePayment(a.ctx, order.orderId, { amountVnd: 800_000 }))).toBe("UNPROCESSABLE_ENTITY")
    const bal = await adminConfirmBrochurePayment(a.ctx, order.orderId)
    expect(bal).toMatchObject({ kind: "BALANCE", balanceVnd: 0 })
    expect(await codeOf(adminConfirmBrochurePayment(a.ctx, order.orderId))).toBe("CONFLICT")
    expect(await prisma.order_payments.count({ where: { order_id: order.orderId } })).toBe(2)
    expect(await prisma.audit_logs.count({ where: { organization_id: a.organizationId, action: "greeting_card.order.payment.record" } })).toBe(2)
  })

  it("huỷ đơn trả lại mã giảm giá; hoàn tiền không vượt số đã thu; tổ chức khác không đụng được", async () => {
    await prisma.vouchers.create({ data: { organization_id: a.organizationId, code: "GIAM", discount_value: 10 } })
    const { order } = await orderFor(a, "GIAM")
    await adminConfirmBrochurePayment(a.ctx, order.orderId)

    expect(await codeOf(cancelBrochureOrder(b.ctx, order.orderId, "nhầm"))).toBe("NOT_FOUND")
    expect(await codeOf(refundBrochureOrder(b.ctx, order.orderId, { amountVnd: 1, reason: "abc" }))).toBe("NOT_FOUND")

    const cancelled = await cancelBrochureOrder(a.ctx, order.orderId, "Khách đổi ý")
    expect(cancelled.status).toBe("CANCELLED")
    expect((await prisma.vouchers.findFirstOrThrow({ where: { code: "GIAM" } })).is_used).toBe(false)
    expect(await codeOf(cancelBrochureOrder(a.ctx, order.orderId, "lần hai"))).toBe("CONFLICT")
    expect(await codeOf(adminConfirmBrochurePayment(a.ctx, order.orderId, { amountVnd: 1000 }))).toBe("CONFLICT")

    expect(await codeOf(refundBrochureOrder(a.ctx, order.orderId, { amountVnd: 999_999_999, reason: "abc" }))).toBe("UNPROCESSABLE_ENTITY")
    const refunded = await refundBrochureOrder(a.ctx, order.orderId, { amountVnd: cancelled.paidVnd, reason: "Hoàn cọc" })
    expect(refunded.paidVnd).toBe(0)
    expect(await prisma.order_payments.count({ where: { order_id: order.orderId, kind: "REFUND" } })).toBe(1)
  })
})
