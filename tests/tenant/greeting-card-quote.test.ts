import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { BrochureOrderRepository } from "@/modules/greeting-card/infra/brochure-order-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { getGreetingCatalogForCustomer } from "@/modules/greeting-card/use-cases/get-greeting-catalog"
import {
  adminConfirmBrochurePayment,
  cancelBrochureOrder,
  quoteBrochureOrder,
} from "@/modules/greeting-card/use-cases/confirm-brochure-payment"

/**
 * Mẫu chưa niêm yết giá (cách của PR #6): khách vẫn đặt được, đơn ghi tổng 0,
 * không hiện QR; cửa hàng báo giá sau rồi mới thu tiền.
 */

const inTenDays = () => new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)
const ORDER = {
  customerName: "K", customerPhone: "0987654321", recipientName: "N", recipientPhone: "0912345678",
  confirmedTerms: true, selectedPromotionId: "promo-free-card", // ưu đãi tặng kèm — không đổi số tiền bài này kiểm
  deliveryDate: inTenDays(), deliveryAddress: "12 Lê Lợi, Q1",
}

async function codeOf(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p
    return undefined
  } catch (err) {
    return (err as { code?: string }).code
  }
}

describe("greeting-card quote (mẫu chưa niêm yết giá)", () => {
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

  async function unpricedLink(t: Tenant) {
    await prisma.organizations.update({
      where: { id: t.organizationId },
      data: {
        settings: {
          brochure_payment: { bank_id: "VCB", account_no: "0011223344", account_name: "TIEM A" },
          brochure_shipping: { zones: [{ id: "q1", name: "Quận 1", fee_vnd: 30_000 }], voucher_enabled: true },
        },
      },
    })
    const product = await new ProductRepository().create(t.ctx, { code: "P0", name: "Bó hoa đặt riêng" })
    const catalog = await new GreetingCardRepository().createCatalog(t.ctx, { code: "c", name: "C", productIds: [product.id], createdBy: t.userId })
    const link = await createSendLink(t.ctx, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, product.id)
    return { link, product }
  }

  it("nhận đơn tổng 0, không QR, không tính phí giao; mã giảm giá bị từ chối", async () => {
    const { link } = await unpricedLink(a)
    expect(await codeOf(submitBrochureOrder(link.sendCode, { ...ORDER, shippingZoneId: "q1", voucherCode: "GIAM10" }))).toBe("VALIDATION_FAILED")

    const order = await submitBrochureOrder(link.sendCode, { ...ORDER, shippingZoneId: "q1" })
    expect(order).toMatchObject({ totalVnd: 0, vietQr: null, quote: { awaitingQuote: true, shippingFeeVnd: 0 } })
    const row = await prisma.orders.findUniqueOrThrow({ where: { id: order.orderId } })
    expect(Number(row.total_vnd)).toBe(0)
    expect(row.internal_note).toContain("[Chờ báo giá]")

    // Chưa báo giá thì chưa thu tiền được
    expect(await codeOf(adminConfirmBrochurePayment(a.ctx, order.orderId, { amountVnd: 100_000 }))).toBe("CONFLICT")
    const outstanding = await new BrochureOrderRepository().listBrochureOrders(a.ctx, { payment: "OUTSTANDING", limit: 10 })
    expect(outstanding.map((o: { id: string }) => o.id)).toContain(order.orderId)
    // Mở đúng đơn từ Hộp việc: lọc theo orderId bỏ qua bộ lọc tab, tổ chức khác không thấy
    const focused = await new BrochureOrderRepository().listBrochureOrders(a.ctx, { orderId: order.orderId, payment: "PAID", limit: 10 })
    expect(focused).toEqual([])
    expect((await new BrochureOrderRepository().listBrochureOrders(a.ctx, { orderId: order.orderId, limit: 10 })).map((o: { id: string }) => o.id)).toEqual([order.orderId])
    expect(await new BrochureOrderRepository().listBrochureOrders(b.ctx, { orderId: order.orderId, limit: 10 })).toEqual([])
  })

  it("cửa hàng báo giá → khách thấy QR đúng số tiền; không báo giá lại; tổ chức khác nhận 404", async () => {
    const { link } = await unpricedLink(a)
    const order = await submitBrochureOrder(link.sendCode, { ...ORDER, shippingZoneId: "q1" })

    expect(await codeOf(quoteBrochureOrder(b.ctx, order.orderId, 850_000))).toBe("NOT_FOUND")
    expect(await codeOf(quoteBrochureOrder(a.ctx, order.orderId, 0))).toBe("UNPROCESSABLE_ENTITY")

    const quoted = await quoteBrochureOrder(a.ctx, order.orderId, 850_000, "Thêm hoa nhập")
    expect(quoted).toMatchObject({ totalVnd: 850_000, balanceVnd: 850_000 })
    // Lý do giá chốt lưu kèm báo giá để Điều hành đối chiếu khi xác nhận thanh toán
    const row = await prisma.orders.findUniqueOrThrow({ where: { id: order.orderId } })
    expect(row.pricing_rule_ref).toMatchObject({ quotedTotalVnd: 850_000, quoteReason: "Thêm hoa nhập" })
    expect(await codeOf(quoteBrochureOrder(a.ctx, order.orderId, 900_000))).toBe("CONFLICT")
    expect(await prisma.audit_logs.count({ where: { organization_id: a.organizationId, action: "greeting_card.order.quote" } })).toBe(1)

    const view = await getGreetingCatalogForCustomer(link.sendCode)
    expect(view.status === "ACTIVE" && view.payment).toMatchObject({ amount: 850_000 })
    expect(await adminConfirmBrochurePayment(a.ctx, order.orderId)).toMatchObject({ balanceVnd: 0 })
  })

  it("không báo giá được đơn đã huỷ", async () => {
    const { link } = await unpricedLink(a)
    const order = await submitBrochureOrder(link.sendCode, { ...ORDER, shippingZoneId: "q1" })
    await cancelBrochureOrder(a.ctx, order.orderId, "Khách đổi ý")
    expect(await codeOf(quoteBrochureOrder(a.ctx, order.orderId, 500_000))).toBe("CONFLICT")
  })
})
