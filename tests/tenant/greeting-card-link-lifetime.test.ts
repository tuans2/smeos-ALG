import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { createShareLink, openShareLink } from "@/modules/greeting-card/use-cases/share-links"
import { getGreetingCatalogForCustomer } from "@/modules/greeting-card/use-cases/get-greeting-catalog"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { startAnotherOrder } from "@/modules/greeting-card/use-cases/start-another-order"
import { LINK_LIFETIME_SETTINGS_KEY } from "@/modules/greeting-card/domain/link-lifetime"

/** Thời hạn link gửi khách do Điều hành cài (mặc định 24 giờ); hết hạn → báo khách liên hệ tiệm. */

const HOUR = 3_600_000
const ORDER_INPUT = {
  customerName: "Khách Hàng",
  customerPhone: "0987654321",
  recipientName: "Người Nhận",
  recipientPhone: "0912345678",
  confirmedTerms: true, selectedPromotionId: "promo-discount-10",
  deliveryDate: new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10),
  deliveryAddress: "123 Đường Hoa, Quận 1, TP.HCM",
}

describe("greeting-card link lifetime", () => {
  let a: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function catalog() {
    const product = await new ProductRepository().create(a.ctx, { code: "HOA-1", name: "Bó hoa 1", attributes: { price: 500000 } })
    const cat = await new GreetingCardRepository().createCatalog(a.ctx, { code: "bo-1", name: "Bộ 1", productIds: [product.id], createdBy: a.userId })
    return { product, catalogId: cat.id }
  }

  const hoursUntil = (iso: string | Date | null) => (new Date(iso as string).getTime() - Date.now()) / HOUR

  it("mặc định link riêng hết hạn sau 24 giờ kể từ lúc tạo", async () => {
    const { catalogId } = await catalog()
    const link = await createSendLink(a.ctx, { catalogId })
    expect(hoursUntil(link.expiresAt)).toBeGreaterThan(23.9)
    expect(hoursUntil(link.expiresAt)).toBeLessThanOrEqual(24)
  })

  it("dùng số giờ Điều hành cài cho link riêng và cho từng khách mở link chia sẻ", async () => {
    await prisma.organizations.update({ where: { id: a.organizationId }, data: { settings: { [LINK_LIFETIME_SETTINGS_KEY]: 48 } } })
    const { catalogId } = await catalog()
    const link = await createSendLink(a.ctx, { catalogId })
    expect(Math.round(hoursUntil(link.expiresAt))).toBe(48)
    const share = await createShareLink(a.ctx, { catalogId })
    const opened = await openShareLink(share.code, null)
    const session = await prisma.greeting_sessions.findUniqueOrThrow({ where: { id: opened!.sessionId } })
    expect(Math.round(hoursUntil(session.expires_at))).toBe(48)
  })

  it("hết hạn mà chưa có đơn → báo khách link hết hạn kèm liên hệ tiệm; đã có đơn vẫn mở được", async () => {
    const { product, catalogId } = await catalog()
    const idle = await createSendLink(a.ctx, { catalogId })
    await prisma.greeting_sessions.update({ where: { id: idle.sessionId }, data: { expires_at: new Date(Date.now() - 1000) } })
    const view = await getGreetingCatalogForCustomer(idle.sendCode)
    expect(view).toMatchObject({ status: "UNAVAILABLE", reason: "EXPIRED" })

    const ordered = await createSendLink(a.ctx, { catalogId })
    await selectBrochureProduct(ordered.sendCode, product.id)
    await submitBrochureOrder(ordered.sendCode, ORDER_INPUT)
    await prisma.greeting_sessions.update({ where: { id: ordered.sessionId }, data: { expires_at: new Date(Date.now() - 1000) } })
    expect((await getGreetingCatalogForCustomer(ordered.sendCode)).status).toBe("ACTIVE")

    // Đặt thêm đơn từ link cũ đã quá hạn: phiên mới có hạn mới, không chết ngay
    const next = await startAnotherOrder(ordered.sendCode)
    expect((await getGreetingCatalogForCustomer(next.sendCode)).status).toBe("ACTIVE")
  })

  it("link thu hồi vẫn dùng lời nhắn chung, không phải hết hạn", async () => {
    const { catalogId } = await catalog()
    const link = await createSendLink(a.ctx, { catalogId })
    await prisma.greeting_sessions.update({ where: { id: link.sessionId }, data: { revoked_at: new Date() } })
    expect(await getGreetingCatalogForCustomer(link.sendCode)).toMatchObject({ status: "UNAVAILABLE", reason: "CLOSED" })
  })
})
