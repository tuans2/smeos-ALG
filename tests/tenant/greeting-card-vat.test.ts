import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { quoteBrochureOrder } from "@/modules/greeting-card/use-cases/confirm-brochure-payment"
import { getOrderSlip, getOrderVat, setOrderVat } from "@/modules/greeting-card/use-cases/order-vat"
import { decideDiscount, requestDiscount } from "@/modules/greeting-card/use-cases/discount-requests"

/** Hoá đơn VAT (PO 15/10/2026): 8%/10%, tổng do máy chủ tính, tổ chức khác nhận 404. */

const inTenDays = () => new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)
const ORDER = {
  customerName: "K", customerPhone: "0987654321", recipientName: "N", recipientPhone: "0912345678",
  confirmedTerms: true, selectedPromotionId: "promo-free-card", deliveryDate: inTenDays(), deliveryAddress: "12 Lê Lợi, Q1",
}

async function codeOf(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p
    return undefined
  } catch (err) {
    return (err as { code?: string }).code
  }
}

describe("greeting-card order VAT", () => {
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

  async function quotedOrder(t: Tenant, totalVnd: number) {
    await prisma.organizations.update({
      where: { id: t.organizationId },
      data: {
        settings: {
          brochure_payment: { bank_id: "VCB", account_no: "0011223344", account_name: "TIEM A" },
          brochure_shipping: { zones: [{ id: "q1", name: "Quận 1", fee_vnd: 0 }] },
        },
      },
    })
    const product = await new ProductRepository().create(t.ctx, { code: "P0", name: "Chậu lan" })
    const catalog = await new GreetingCardRepository().createCatalog(t.ctx, { code: "c", name: "C", productIds: [product.id], createdBy: t.userId })
    const link = await createSendLink(t.ctx, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, product.id)
    const order = await submitBrochureOrder(link.sendCode, { ...ORDER, shippingZoneId: "q1" })
    await quoteBrochureOrder(t.ctx, order.orderId, totalVnd)
    return order.orderId
  }

  it("bật 10% → đổi 8% → tắt; lưu ô xuất hoá đơn; tổ chức khác 404", async () => {
    const orderId = await quotedOrder(a, 3_300_000)

    expect(await codeOf(getOrderVat(b.ctx, orderId))).toBe("NOT_FOUND")
    expect(await codeOf(getOrderSlip(b.ctx, orderId))).toBe("NOT_FOUND")
    expect(await getOrderSlip(a.ctx, orderId)).toMatchObject({ productCode: "P0" })
    expect(await codeOf(setOrderVat(b.ctx, orderId, { enabled: true, rate: 10 }))).toBe("NOT_FOUND")

    const on = await setOrderVat(a.ctx, orderId, { enabled: true, rate: 10, companyName: "Cty Đông Nam", taxCode: "0123456789", email: "kt@dn.vn" })
    expect(on).toMatchObject({ vatEnabled: true, vatRate: 10, vatAmountVnd: 330_000, subtotalVnd: 3_300_000, totalVnd: 3_630_000, companyName: "Cty Đông Nam" })

    const eight = await setOrderVat(a.ctx, orderId, { enabled: true, rate: 8, companyName: "Cty Đông Nam" })
    expect(eight).toMatchObject({ vatAmountVnd: 264_000, totalVnd: 3_564_000 })

    const off = await setOrderVat(a.ctx, orderId, { enabled: false, rate: 10 })
    expect(off).toMatchObject({ vatEnabled: false, vatAmountVnd: 0, totalVnd: 3_300_000 })
    const row = await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })
    expect(Number(row.balance_vnd)).toBe(3_300_000)
  })

  it("chưa báo giá thì không thêm VAT được", async () => {
    const orderId = await quotedOrder(a, 1_000_000)
    await prisma.orders.update({ where: { id: orderId }, data: { total_vnd: 0, balance_vnd: 0 } })
    expect(await codeOf(setOrderVat(a.ctx, orderId, { enabled: true, rate: 10 }))).toBe("CONFLICT")
  })

  it("duyệt giảm giá trên đơn có VAT: giảm tính trên giá trước thuế, VAT tính lại", async () => {
    const orderId = await quotedOrder(a, 3_300_000)
    await setOrderVat(a.ctx, orderId, { enabled: true, rate: 10 })
    const req = await requestDiscount(a.ctx, { orderId, ask: { amountVnd: 300_000 }, reason: "Khách quen" })
    // Người xin giảm không tự duyệt (checklist ALG 9.12) — Điều hành thứ hai duyệt
    await expect(decideDiscount(a.ctx, { requestId: req.id, approve: true, note: "" })).rejects.toMatchObject({ status: 422 })
    const second = await addStaffWithSession(a, "dieu_hanh", "dieu-hanh-2")
    await decideDiscount({ ...a.ctx, userId: second.userId }, { requestId: req.id, approve: true, note: "" })
    expect(await getOrderVat(a.ctx, orderId)).toMatchObject({ subtotalVnd: 3_000_000, vatAmountVnd: 300_000, totalVnd: 3_300_000 })
  })
})
