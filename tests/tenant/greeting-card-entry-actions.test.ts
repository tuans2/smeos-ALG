import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import { phoneEquals } from "@/core/security/pii-lookup"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { quoteBrochureSession, submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { quotePublicCatalog, submitPublicCatalogOrder } from "@/modules/greeting-card/use-cases/submit-public-catalog-order"
import { getGreetingCatalogForCustomer } from "@/modules/greeting-card/use-cases/get-greeting-catalog"
import { getPublicGreetingCatalog } from "@/modules/greeting-card/use-cases/get-public-greeting-catalog"
import { submitBrochureInquiry, submitProductInquiry } from "@/modules/greeting-card/use-cases/submit-product-inquiry"

/**
 * Bộ sưu tập riêng (Thẻ chào): công tắc "Đặt hàng" / "Liên hệ" của chủ cửa hàng (nguồn BROCHURE)
 * và lead từ tin nhắn tư vấn. Tổ chức luôn suy từ link — tiệm khác không bị ảnh hưởng.
 */

const inTenDays = () => new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)
const ORDER = {
  customerName: "K", customerPhone: "0987654321", recipientName: "N", recipientPhone: "0912345678",
  confirmedTerms: true, selectedPromotionId: "promo-free-card", deliveryDate: inTenDays(), deliveryAddress: "12 Lê Lợi, Q1", shippingZoneId: "q1",
}
const INQUIRY = { customerName: "Lan", customerPhone: "0912345678", message: "Cho mình hỏi mẫu này" }

async function codeOf(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p
    return undefined
  } catch (err) {
    return (err as { code?: string }).code
  }
}

describe("Bộ sưu tập riêng — công tắc Đặt hàng / Liên hệ", () => {
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

  async function setup(t: Tenant, code: string, entry?: { order?: boolean; contact?: boolean }) {
    const product = await new ProductRepository().create(t.ctx, { code: `P-${code}`, name: "Bó hồng", attributes: { price: 500000 } })
    const catalog = await new GreetingCardRepository().createCatalog(t.ctx, { code, name: "Bộ", productIds: [product.id], createdBy: t.userId })
    await prisma.organizations.update({
      where: { id: t.organizationId },
      data: {
        settings: {
          brochure_shipping: { zones: [{ id: "q1", name: "Quận 1", fee_vnd: 30000 }] },
          ...(entry ? { order_entry_actions: { bySource: { BROCHURE: entry } } } : {}),
        },
      },
    })
    const link = await createSendLink(t.ctx, { catalogId: catalog.id })
    return { product, catalog, link }
  }

  it("chưa cài gì → như trước: đặt được, trang khách báo Liên hệ tắt", async () => {
    const { product, link } = await setup(a, "mac-dinh")
    const view = await getGreetingCatalogForCustomer(link.sendCode)
    expect(view).toMatchObject({ status: "ACTIVE", entryActions: { order: true, contact: false } })
    await selectBrochureProduct(link.sendCode, product.id)
    const order = await submitBrochureOrder(link.sendCode, ORDER)
    expect(order.orderCode).toMatch(/^DH/)
  })

  it("tắt Đặt hàng → chọn mẫu / báo giá / gửi đơn ở link riêng đều 404, không tạo đơn", async () => {
    const { product, link } = await setup(a, "tat-dat", { order: false, contact: true })
    expect(await getGreetingCatalogForCustomer(link.sendCode)).toMatchObject({ entryActions: { order: false, contact: true } })
    expect(await codeOf(selectBrochureProduct(link.sendCode, product.id))).toBe("NOT_FOUND")
    expect(await codeOf(quoteBrochureSession(link.sendCode, { productId: product.id } as never))).toBe("NOT_FOUND")
    expect(await codeOf(submitBrochureOrder(link.sendCode, ORDER))).toBe("NOT_FOUND")
    expect(await prisma.orders.count({ where: { organization_id: a.organizationId } })).toBe(0)
  })

  it("tắt Đặt hàng → link bộ sưu tập công khai cũng không báo giá / nhận đơn", async () => {
    const { product, catalog } = await setup(a, "tat-cong-khai", { order: false, contact: true })
    expect(await getPublicGreetingCatalog(catalog.id)).toMatchObject({ entryActions: { order: false, contact: true } })
    expect(await codeOf(submitPublicCatalogOrder(catalog.id, { ...ORDER, productId: product.id }))).toBe("NOT_FOUND")
    expect(await codeOf(quotePublicCatalog(catalog.id, product.id, {} as never))).toBe("NOT_FOUND")
  })

  it("tiệm A tắt Đặt hàng không ảnh hưởng tiệm B", async () => {
    await setup(a, "a-tat", { order: false, contact: true })
    const { product, link } = await setup(b, "b-mo")
    await selectBrochureProduct(link.sendCode, product.id)
    expect((await submitBrochureOrder(link.sendCode, ORDER)).orderCode).toMatch(/^DH/)
  })

  it("tin nhắn tư vấn có đồng ý liên hệ → hội thoại + lead BROCHURE đúng tổ chức của link", async () => {
    const { product, link } = await setup(b, "lead-rieng")
    await submitBrochureInquiry(link.sendCode, { ...INQUIRY, productId: product.id, consent: true })
    const leads = await prisma.leads.findMany({ where: phoneEquals(b.organizationId, "0912345678") })
    expect(leads).toHaveLength(1)
    expect(leads[0]).toMatchObject({ organization_id: b.organizationId, source: "BROCHURE", source_ref: link.sendCode, reason: "CONTACT", status: "NEW" })
    expect(await prisma.leads.count({ where: { organization_id: a.organizationId } })).toBe(0)
  })

  it("tin nhắn tư vấn từ link công khai có đồng ý → lead mang id bộ sưu tập", async () => {
    const { product, catalog } = await setup(a, "lead-cong-khai")
    await submitProductInquiry(catalog.id, { ...INQUIRY, productId: product.id, consent: true })
    expect(await prisma.leads.findFirst({ where: { organization_id: a.organizationId } })).toMatchObject({ source: "BROCHURE", source_ref: catalog.id })
  })

  it("chưa đồng ý liên hệ → chỉ ghi hội thoại, không tạo lead", async () => {
    const { product, link } = await setup(a, "khong-dong-y")
    await submitBrochureInquiry(link.sendCode, { ...INQUIRY, productId: product.id })
    expect(await prisma.leads.count({ where: { organization_id: a.organizationId } })).toBe(0)
  })
})
