import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { TenantContext } from "@/core/tenancy"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { quoteBrochureSession, submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"

/** Quy định ngày lễ (08/10/2026): số đơn tối đa áp cả tiệm, phụ phí chỉ khi bộ sưu tập bật. */

const HOLIDAY = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10)
const NORMAL = new Date(Date.now() + 21 * 86_400_000).toISOString().slice(0, 10)
const order = (date: string, phone: string) => ({
  customerName: "Khách", customerPhone: phone, recipientName: "Người Nhận", recipientPhone: "0912345678",
  confirmedTerms: true, selectedPromotionId: "promo-free-card", // ưu đãi tặng kèm — không đổi số tiền bài này kiểm
  deliveryDate: date, deliveryTimeSlot: "08:00 - 10:00", deliveryAddress: "1 Lê Lợi, Q1",
})

async function codeOf(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p
    return undefined
  } catch (err) {
    return (err as { code?: string }).code
  }
}

describe("greeting-card: quy định ngày lễ", () => {
  let a: Tenant
  let staff: TenantContext

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    staff = { ...a.ctx, capabilities: new Set(["R1", "R2", "R9"]) }
    await prisma.organizations.update({
      where: { id: a.organizationId },
      data: { settings: { brochure_holidays: { days: [{ id: "h", name: "Ngày thử", date: HOLIDAY, max_orders: 1, surcharge_vnd: 40000 }] } } },
    })
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function linkFor(applyHolidaySurcharge: boolean, code: string) {
    const product = await new ProductRepository().create(a.ctx, { code: `HOA-${code}`, name: "Bó L", attributes: { price: 500000 } })
    const catalog = await new GreetingCardRepository().createCatalog(a.ctx, {
      code, name: `Bộ ${code}`, productIds: [product.id], createdBy: a.userId,
      filters: { appliedPolicies: { applyHolidaySurcharge } },
    })
    const link = await createSendLink(staff, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, product.id)
    return link.sendCode
  }

  it("bộ sưu tập bật phụ phí → báo giá + đơn cộng phụ phí; ngày thường không cộng", async () => {
    const sendCode = await linkFor(true, "bst-le")
    expect((await quoteBrochureSession(sendCode, { deliveryDate: HOLIDAY })).quote).toMatchObject({ holidaySurchargeVnd: 40000, totalVnd: 540000 })
    expect((await quoteBrochureSession(sendCode, { deliveryDate: NORMAL })).quote.totalVnd).toBe(500000)
    const placed = await submitBrochureOrder(sendCode, order(HOLIDAY, "0987654321"))
    expect(placed.totalVnd).toBe(540000)
  })

  it("bộ sưu tập không bật → không phụ phí; ngày lễ đủ số đơn tối đa → từ chối đơn mới (cả tiệm)", async () => {
    const first = await linkFor(false, "bst-thuong")
    expect((await submitBrochureOrder(first, order(HOLIDAY, "0987654321"))).totalVnd).toBe(500000)
    const second = await linkFor(true, "bst-khac")
    expect(await codeOf(submitBrochureOrder(second, order(HOLIDAY, "0977654321")))).toBe("VALIDATION_FAILED")
    expect((await submitBrochureOrder(second, order(NORMAL, "0977654321"))).totalVnd).toBe(500000)
  })
})
