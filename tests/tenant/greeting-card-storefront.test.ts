import { randomUUID } from "node:crypto"
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
import { submitPublicCatalogOrder } from "@/modules/greeting-card/use-cases/submit-public-catalog-order"
import { getGreetingCatalogForCustomer, markBrochureOpened } from "@/modules/greeting-card/use-cases/get-greeting-catalog"
import { getPublicGreetingCatalog } from "@/modules/greeting-card/use-cases/get-public-greeting-catalog"
import { adminConfirmBrochurePayment } from "@/modules/greeting-card/use-cases/confirm-brochure-payment"
import { rejectBotSubmission } from "@/modules/greeting-card/contracts/public-order-schema"
import { MAX_ORDERS_PER_PHONE_PER_HOUR } from "@/modules/greeting-card/domain/order-guard"
import { getBrochureTracking } from "@/modules/greeting-card/use-cases/get-brochure-tracking"

/** Trang khách (06/10/2026): QR sau cọc, đếm "đã mở" đúng, chống đơn trùng/đơn rác, mẫu hết hàng. */

const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)
const ORDER = {
  customerName: "Khách Quen", customerPhone: "0987654321", recipientName: "Người Nhận", recipientPhone: "0912345678",
  confirmedTerms: true, selectedPromotionId: "promo-free-card", // ưu đãi tặng kèm — không đổi số tiền bài này kiểm
  deliveryDate: day(10), deliveryAddress: "1 Lê Lợi, Q1",
}

async function codeOf(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p
    return undefined
  } catch (err) {
    return (err as { code?: string }).code
  }
}

describe("greeting-card: trang khách thương mại", () => {
  let a: Tenant
  let owner: TenantContext

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    owner = { ...a.ctx, capabilities: new Set(["R1", "R2", "R4", "R6", "R9", "R10", "F2"]) }
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function catalogWith(price: number, code = "HOA-1") {
    const product = await new ProductRepository().create(a.ctx, { code, name: `Bó ${code}`, attributes: { price } })
    const catalog = await new GreetingCardRepository().createCatalog(a.ctx, { code: code.toLowerCase(), name: "Bộ", productIds: [product.id], createdBy: a.userId })
    return { product, catalog }
  }

  it("đơn mới cọc: phiên chưa 'hoàn tất', khách mở lại link vẫn nhận QR phần còn lại", async () => {
    await prisma.organizations.update({
      where: { id: a.organizationId },
      data: { settings: { brochure_policy: { deposit_percent: 30 }, brochure_payment: { bank_id: "VCB", account_no: "0123456789", account_name: "Tiem Hoa" } } },
    })
    const { product, catalog } = await catalogWith(1_000_000)
    const link = await createSendLink(owner, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, product.id)
    const order = await submitBrochureOrder(link.sendCode, ORDER)
    await adminConfirmBrochurePayment(owner, order.orderId)

    const session = await prisma.greeting_sessions.findFirstOrThrow({ where: { send_code: link.sendCode } })
    expect(session.status).not.toBe("COMPLETED")
    const view = await getGreetingCatalogForCustomer(link.sendCode)
    expect(view.status === "ACTIVE" && view.payment).toMatchObject({ purpose: "BALANCE", amount: 700_000 })

    await adminConfirmBrochurePayment(owner, order.orderId)
    expect((await prisma.greeting_sessions.findFirstOrThrow({ where: { send_code: link.sendCode } })).status).toBe("COMPLETED")
  })

  it("dựng trang không tính là 'khách đã mở'; trình duyệt báo mở thì ghi đúng một lần", async () => {
    const { catalog } = await catalogWith(500_000)
    const link = await createSendLink(owner, { catalogId: catalog.id })
    await getGreetingCatalogForCustomer(link.sendCode) // máy quét xem trước Zalo/Facebook
    expect((await prisma.greeting_sessions.findFirstOrThrow({ where: { send_code: link.sendCode } })).status).toBe("CREATED")

    expect(await markBrochureOpened(link.sendCode)).toEqual({ opened: true })
    expect(await markBrochureOpened(link.sendCode)).toEqual({ opened: false })
    expect(await prisma.greeting_journey_events.count({ where: { event_type: "OPEN" } })).toBe(1)
    expect(await codeOf(markBrochureOpened("T01-KHONGCO1"))).toBe("NOT_FOUND")
  })

  it("link chung: gửi lại cùng đơn trong 10 phút trả lại đơn cũ; khác người nhận là đơn mới", async () => {
    const { product, catalog } = await catalogWith(500_000)
    const first = await submitPublicCatalogOrder(catalog.id, { ...ORDER, productId: product.id })
    const again = await submitPublicCatalogOrder(catalog.id, { ...ORDER, productId: product.id })
    expect(again.orderId).toBe(first.orderId)
    const other = await submitPublicCatalogOrder(catalog.id, { ...ORDER, recipientPhone: "0911111111", productId: product.id })
    expect(other.orderId).not.toBe(first.orderId)
    expect(await prisma.orders.count({ where: { organization_id: a.organizationId } })).toBe(2)
  })

  it("tắt giá + tắt giảm giá (ALG 5.5): phản hồi công khai không có giá, không ưu đãi; đơn vẫn nhận, chờ báo giá", async () => {
    const { product, catalog } = await catalogWith(750_000)
    await prisma.organizations.update({ where: { id: a.organizationId }, data: { settings: { greetingCardPricing: { hidePrice: true, showDiscounts: false } } } })
    const pub = await getPublicGreetingCatalog(catalog.id)
    if (pub.status !== "ACTIVE") throw new Error("catalog phải hoạt động")
    expect(pub.products[0]).toMatchObject({ price: null, priceMaxVnd: null, priceHidden: true, variants: [] })
    expect(JSON.stringify(pub)).not.toContain("750000")
    expect(pub.catalog.filters?.appliedPolicies).toMatchObject({ promotions: [], intakePromotionCta: { enabled: false } })
    const order = await submitPublicCatalogOrder(catalog.id, { ...ORDER, selectedPromotionId: undefined, productId: product.id })
    expect(order).toMatchObject({ totalVnd: 0, vietQr: null, quote: { awaitingQuote: true } })

    const link = await createSendLink(owner, { catalogId: catalog.id })
    const view = await getGreetingCatalogForCustomer(link.sendCode)
    expect(view.status === "ACTIVE" && view.products[0]?.price).toBeNull()
  })

  it("trần đơn theo SĐT mỗi giờ; ô bẫy có giá trị bị từ chối", async () => {
    const { product, catalog } = await catalogWith(500_000)
    for (let i = 0; i < MAX_ORDERS_PER_PHONE_PER_HOUR; i++) {
      await submitPublicCatalogOrder(catalog.id, { ...ORDER, deliveryDate: day(10 + i), productId: product.id })
    }
    const sessionsBefore = await prisma.greeting_sessions.count()
    expect(await codeOf(submitPublicCatalogOrder(catalog.id, { ...ORDER, deliveryDate: day(30), productId: product.id }))).toBe("RATE_LIMITED")
    expect(await prisma.greeting_sessions.count()).toBe(sessionsBefore) // không để lại phiên mồ côi

    expect(() => rejectBotSubmission({ website: "http://spam.example" })).toThrow()
    expect(() => rejectBotSubmission({ website: "" })).not.toThrow()
  })

  it("mẫu Tạm ngưng / Lưu trữ không hiện trên link riêng của khách (2.3); mẫu đang bán vẫn hiện", async () => {
    const product = await new ProductRepository().create(a.ctx, { code: "HOA-BAN", name: "Bó bán", attributes: { price: 500_000 } })
    const paused = await new ProductRepository().create(a.ctx, { code: "HOA-NGUNG", name: "Bó ngưng", attributes: { price: 400_000 }, status: "PAUSED" })
    const archived = await new ProductRepository().create(a.ctx, { code: "HOA-CU", name: "Bó cũ", attributes: { price: 300_000 }, status: "ARCHIVED" })
    const catalog = await new GreetingCardRepository().createCatalog(a.ctx, { code: "ngung", name: "Bộ", productIds: [product.id, paused.id, archived.id], createdBy: a.userId })
    const link = await createSendLink(owner, { catalogId: catalog.id })
    const view = await getGreetingCatalogForCustomer(link.sendCode)
    expect(view.status === "ACTIVE" && view.products.map((p) => p.id)).toEqual([product.id])
  })

  it("trang khách chỉ hứa tự duyệt chuyển khoản khi tiệm bật tự duyệt (mặc định tắt)", async () => {
    const { catalog } = await catalogWith(500_000)
    const off = await getGreetingCatalogForCustomer((await createSendLink(owner, { catalogId: catalog.id })).sendCode)
    expect(off.status === "ACTIVE" && off.autoApprovePaymentMinutes).toBeNull()
    await prisma.organizations.update({ where: { id: a.organizationId }, data: { settings: { brochure_policy: { auto_approve_payment_with_proof: true, auto_approve_payment_with_proof_minutes: 20 } } } })
    const on = await getGreetingCatalogForCustomer((await createSendLink(owner, { catalogId: catalog.id })).sendCode)
    expect(on.status === "ACTIVE" && on.autoApprovePaymentMinutes).toBe(20)
  })

  it("mẫu hết hàng ở chi nhánh của sản phẩm: ẩn khỏi trang khách và không đặt được", async () => {
    const { product, catalog } = await catalogWith(500_000)
    const branch = await prisma.branches.create({ data: { id: randomUUID(), organization_id: a.organizationId, name: "CN1", code: "CN1" } })
    await prisma.products.update({ where: { id: product.id }, data: { branch_id: branch.id } })
    await prisma.product_inventory.create({
      data: { id: randomUUID(), organization_id: a.organizationId, product_id: product.id, branch_id: branch.id, status: "OUT_OF_STOCK" },
    })
    const view = await getPublicGreetingCatalog(catalog.id)
    expect(view.status === "ACTIVE" && view.products).toEqual([])
    expect(await codeOf(submitPublicCatalogOrder(catalog.id, { ...ORDER, productId: product.id }))).toBe("CONFLICT")

    await prisma.product_inventory.updateMany({ where: { product_id: product.id }, data: { status: "IN_STOCK" } })
    expect((await submitPublicCatalogOrder(catalog.id, { ...ORDER, productId: product.id })).orderCode).toMatch(/^DH/)
  })

  it("theo dõi theo mã đơn: mặc định rút gọn; link của khách hoặc đúng 4 số cuối SĐT mới thấy đầy đủ", async () => {
    const { product, catalog } = await catalogWith(500_000)
    const link = await createSendLink(owner, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, product.id)
    const order = await submitBrochureOrder(link.sendCode, {
      ...ORDER, recipientName: "Trần Thị Bích", cardMessage: "Chúc mừng sinh nhật",
      addressParts: { houseNumber: "45", street: "Lê Lợi", ward: "Phường Bến Thành", province: "TP. Hồ Chí Minh" },
    })

    const anon = await getBrochureTracking(order.orderCode)
    expect(anon.status === "FOUND" && anon.order).toMatchObject({
      verified: false, recipientName: "T. T. Bích", deliveryAddress: "Phường Bến Thành, TP. Hồ Chí Minh", cardMessage: null,
    })
    const wrong = await getBrochureTracking(order.orderCode, { phoneLast4: "0000" })
    expect(wrong.status === "FOUND" && wrong.order.verified).toBe(false)

    for (const proof of [{ sendCode: link.sendCode }, { phoneLast4: "4321" }]) {
      const full = await getBrochureTracking(order.orderCode, proof)
      expect(full.status === "FOUND" && full.order).toMatchObject({
        verified: true, recipientName: "Trần Thị Bích", cardMessage: "Chúc mừng sinh nhật",
        deliveryAddress: "45 Lê Lợi, Phường Bến Thành, TP. Hồ Chí Minh",
      })
    }
    // Không bao giờ trả SĐT
    expect(JSON.stringify(await getBrochureTracking(order.orderCode, { sendCode: link.sendCode }))).not.toContain("0987654321")
  })
})
