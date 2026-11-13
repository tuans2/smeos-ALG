import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { Prisma } from "@/generated/prisma/client"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { quoteBrochureSession, submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { quoteBrochureOrder } from "@/modules/greeting-card/use-cases/confirm-brochure-payment"

/**
 * PO 08/10/2026: ưu đãi trừ tiền thật ở máy chủ (báo giá = đơn = QR), miễn phí giao mọi đơn, ẩn mã
 * giảm giá, trần đơn mỗi khung giờ có khoá (hai khách tranh suất cuối → chỉ một người được).
 */

const DELIVERY = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10)
const SLOT = "10:00 - 12:00"
let seq = 0
const order = (over: Record<string, unknown> = {}) => {
  seq += 1
  return {
    customerName: `Khách ${seq}`, customerPhone: `09${String(10_000_000 + seq).slice(-8)}`, recipientName: "Người Nhận",
    recipientPhone: "0912345678", confirmedTerms: true, selectedPromotionId: "promo-discount-10", deliveryDate: DELIVERY, deliveryTimeSlot: SLOT,
    deliveryAddress: "1 Lê Lợi, Q1", shippingZoneId: "q1", ...over,
  }
}

async function codeOf(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p
    return undefined
  } catch (err) {
    return (err as { code?: string }).code
  }
}

describe("greeting-card: ưu đãi tính tiền + trần khung giờ", () => {
  let a: Tenant
  let catalogId: string
  let priced: string
  let unpriced: string

  async function setShipping(extra: Record<string, unknown>) {
    const settings = {
      brochure_shipping: { zones: [{ id: "q1", name: "Quận 1", fee_vnd: 30_000 }], ...extra },
      brochure_payment: { bank_id: "VCB", account_no: "0123456789", account_name: "TIEM HOA" },
    }
    await prisma.organizations.update({ where: { id: a.organizationId }, data: { settings: settings as Prisma.InputJsonValue } })
  }

  async function newLink(productId: string) {
    const link = await createSendLink({ ...a.ctx, capabilities: new Set(["R2"]) }, { catalogId })
    await selectBrochureProduct(link.sendCode, productId)
    return link.sendCode
  }

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    const products = new ProductRepository()
    priced = (await products.create(a.ctx, { code: "HOA-1", name: "Bó 1", attributes: { price: 500_000 } })).id
    unpriced = (await products.create(a.ctx, { code: "HOA-2", name: "Bó đặt riêng", attributes: {} })).id
    catalogId = (await new GreetingCardRepository().createCatalog(a.ctx, { code: "le", name: "20/10", productIds: [priced, unpriced], createdBy: a.userId })).id
    await setShipping({})
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("khách phải tự chọn ưu đãi: báo giá chưa chọn không trừ; đặt đơn chưa chọn bị chặn, không tạo đơn", async () => {
    const code = await newLink(priced)
    const quote = await quoteBrochureSession(code, { shippingZoneId: "q1" })
    expect(quote.quote.promotionDiscountVnd).toBeUndefined()
    expect(await codeOf(submitBrochureOrder(code, order({ selectedPromotionId: undefined })))).toBe("VALIDATION_FAILED")
    expect(await prisma.orders.count({ where: { organization_id: a.organizationId } })).toBe(0)
  })

  it("Giảm 10% trừ thật trên tổng đơn: báo giá, đơn và mã QR cùng một số; Tặng thiệp không đổi tiền", async () => {
    const code = await newLink(priced)
    const quote = await quoteBrochureSession(code, { shippingZoneId: "q1", selectedPromotionId: "promo-discount-10" })
    expect(quote.quote).toMatchObject({ totalVnd: 477_000, promotionDiscountVnd: 53_000 })

    const placed = await submitBrochureOrder(code, order({ selectedPromotionId: "promo-discount-10" }))
    expect(placed.totalVnd).toBe(477_000)
    expect(placed.vietQr?.amount).toBe(477_000)
    const row = await prisma.orders.findUniqueOrThrow({ where: { id: placed.orderId } })
    expect(Number(row.total_vnd)).toBe(477_000)
    expect(row.internal_note).toContain("[Ưu đãi: Giảm 10%]")

    const gift = await submitBrochureOrder(await newLink(priced), order({ selectedPromotionId: "promo-free-card" }))
    expect(gift.totalVnd).toBe(530_000)
  })

  it("miễn phí giao mọi đơn; mã giảm giá gửi thẳng API bị bỏ qua khi tiệm tắt", async () => {
    await setShipping({ free_shipping_all: true })
    await prisma.vouchers.create({
      data: { organization_id: a.organizationId, code: "GIAM50", discount_type: "FIXED_AMOUNT", discount_value: 50_000, min_order_vnd: 0 },
    })
    const placed = await submitBrochureOrder(await newLink(priced), order({ selectedPromotionId: "promo-free-card", voucherCode: "GIAM50" }))
    expect(placed.totalVnd).toBe(500_000)
    expect(await prisma.vouchers.count({ where: { organization_id: a.organizationId, is_used: true } })).toBe(0)
  })

  it("mẫu báo giá sau: Điều hành báo 900.000đ, máy tự trừ 10% khách đã chọn", async () => {
    const placed = await submitBrochureOrder(await newLink(unpriced), order({ selectedPromotionId: "promo-discount-10" }))
    expect(placed.totalVnd).toBe(0)
    const quoted = await quoteBrochureOrder({ ...a.ctx, capabilities: new Set(["R11"]) }, placed.orderId, 900_000)
    expect(quoted).toMatchObject({ totalVnd: 810_000, promotionDiscountVnd: 90_000 })
  })

  it("trần 3 đơn/khung: 10 khách đặt cùng lúc → đúng 3 đơn; báo giá báo khung 'đã kín'", async () => {
    await setShipping({ slot_capacity: { default: 100, per_slot: { "10-12": 3 } } })
    const codes = await Promise.all(Array.from({ length: 10 }, () => newLink(priced)))
    const results = await Promise.all(codes.map((c) => codeOf(submitBrochureOrder(c, order()))))
    expect(results.filter((r) => r === undefined)).toHaveLength(3)
    expect(results.filter((r) => r === "VALIDATION_FAILED")).toHaveLength(7)
    const inSlot = await prisma.orders.count({ where: { organization_id: a.organizationId, delivery_window: { path: ["timeSlot"], equals: SLOT } } })
    expect(inSlot).toBe(3)

    const quote = await quoteBrochureSession(await newLink(priced), { deliveryDate: DELIVERY })
    expect(quote.fullSlots).toEqual([SLOT])
    // Giờ cụ thể trong khung đã kín cũng bị chặn; khung khác vẫn đặt được
    expect(await codeOf(submitBrochureOrder(await newLink(priced), order({ deliveryTimeSlot: "Giờ cụ thể: 11:15" })))).toBe("VALIDATION_FAILED")
    expect(await codeOf(submitBrochureOrder(await newLink(priced), order({ deliveryTimeSlot: "14:00 - 16:00" })))).toBeUndefined()
  })

  it("đơn huỷ trả lại suất của khung giờ", async () => {
    await setShipping({ slot_capacity: { default: 1 } })
    const first = await submitBrochureOrder(await newLink(priced), order())
    expect(await codeOf(submitBrochureOrder(await newLink(priced), order()))).toBe("VALIDATION_FAILED")
    await prisma.orders.update({ where: { id: first.orderId }, data: { status: "CANCELLED" } })
    expect(await codeOf(submitBrochureOrder(await newLink(priced), order()))).toBeUndefined()
  })
})
