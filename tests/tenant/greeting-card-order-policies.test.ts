import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { submitPublicCatalogOrder } from "@/modules/greeting-card/use-cases/submit-public-catalog-order"
import { customTimeLabel } from "@/modules/greeting-card/domain/delivery-schedule"

/** Ưu đãi (đúng 01) + thỏa thuận (bắt buộc xác nhận) + khung giờ tiệm bật/tắt — kiểm ở máy chủ (08/10/2026). */

const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)
const ORDER = {
  customerName: "Khách Quen", customerPhone: "0987654321", recipientName: "Người Nhận", recipientPhone: "0912345678",
  deliveryDate: day(5), deliveryTimeSlot: "18:00 - 20:00", deliveryAddress: "1 Lê Lợi, Q1",
}

async function codeOf(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p
    return undefined
  } catch (err) {
    return (err as { code?: string }).code
  }
}

describe("greeting-card: ưu đãi, thỏa thuận và khung giờ lúc đặt hoa", () => {
  let a: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    await prisma.organizations.update({
      where: { id: a.organizationId },
      data: {
        settings: {
          brochure_shipping: { zones: [], delivery_slots: ["08-10", "18-20"], allow_custom_time: false },
          store_policies: {
            promotions: [
              { id: "p1", title: "Tặng thiệp", description: "Thiệp viết tay" },
              { id: "p2", title: "Thêm 3 cành", description: "Hồng thêm" },
            ],
            agreements: [
              { id: "a1", title: "Hoa thay thế", customerText: "Có thể thay hoa phụ" },
              { id: "a2", title: "Màu sai khác", customerText: "Màu có thể lệch nhẹ" },
            ],
          },
        },
      },
    })
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function catalog() {
    const product = await new ProductRepository().create(a.ctx, { code: "HOA-1", name: "Bó hoa", attributes: { price: 500_000 } })
    const cat = await new GreetingCardRepository().createCatalog(a.ctx, { code: "hoa-1", name: "Bộ", productIds: [product.id], createdBy: a.userId })
    await prisma.greeting_catalogs.update({ where: { id: cat.id }, data: { filters: { appliedPolicies: { allowCustomerPromotionChoice: true } } } })
    return { product, cat }
  }

  it("chưa xác nhận thỏa thuận → từ chối, không tạo đơn", async () => {
    const { product, cat } = await catalog()
    expect(await codeOf(submitPublicCatalogOrder(cat.id, { ...ORDER, productId: product.id, selectedPromotionId: "p1" }))).toBe("VALIDATION_FAILED")
    expect(await prisma.orders.count({ where: { organization_id: a.organizationId } })).toBe(0)
  })

  it("ưu đãi ngoài danh sách → từ chối", async () => {
    const { product, cat } = await catalog()
    const input = { ...ORDER, productId: product.id, selectedPromotionId: "p-khac", confirmedTerms: true }
    expect(await codeOf(submitPublicCatalogOrder(cat.id, input))).toBe("VALIDATION_FAILED")
  })

  it("khung giờ tiệm đã tắt / giờ cụ thể đang tắt → từ chối", async () => {
    const { product, cat } = await catalog()
    const base = { ...ORDER, productId: product.id, selectedPromotionId: "p1", confirmedTerms: true }
    expect(await codeOf(submitPublicCatalogOrder(cat.id, { ...base, deliveryTimeSlot: "14:00 - 16:00" }))).toBe("VALIDATION_FAILED")
    expect(await codeOf(submitPublicCatalogOrder(cat.id, { ...base, deliveryTimeSlot: customTimeLabel("15:00") }))).toBe("VALIDATION_FAILED")
  })

  it("đơn hợp lệ lưu đúng 01 ưu đãi + mọi thỏa thuận khách đã đồng ý", async () => {
    const { product, cat } = await catalog()
    const res = await submitPublicCatalogOrder(cat.id, { ...ORDER, productId: product.id, selectedPromotionId: "p2", confirmedTerms: true })
    const order = await prisma.orders.findUniqueOrThrow({ where: { id: res.orderId } })
    const policies = (order.pricing_rule_ref as { policies?: unknown }).policies
    expect(policies).toEqual({
      promotion: { id: "p2", title: "Thêm 3 cành", customerText: "Hồng thêm", kind: "GIFT", percent: null },
      agreements: [{ id: "a1", title: "Hoa thay thế" }, { id: "a2", title: "Màu sai khác" }],
      termsConfirmed: true,
    })
    expect(order.internal_note).toContain("[Ưu đãi: Thêm 3 cành]")
    expect((order.delivery_window as { timeSlot?: string }).timeSlot).toBe("18:00 - 20:00")
  })
})
