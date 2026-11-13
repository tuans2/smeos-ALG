import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { startAnotherOrder } from "@/modules/greeting-card/use-cases/start-another-order"
import { getOrderFamily } from "@/modules/greeting-card/use-cases/get-order-family"
import { familyResumeTarget } from "@/modules/greeting-card/domain/order-family"
import { GET as historyGET } from "@/app/api/v1/public/brochure/[sendCode]/history/route"

/** Khách đặt thêm đơn trên cùng link: mở lại link cũ phải về đúng đơn đang làm dở + có Lịch sử đơn hàng. */

const ORDER_INPUT = {
  customerName: "Khách Hàng", customerPhone: "0987654321", recipientName: "Người Nhận", recipientPhone: "0912345678",
  confirmedTerms: true, selectedPromotionId: "promo-discount-10",
  deliveryDate: new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10), deliveryAddress: "123 Đường Hoa, Quận 1, TP.HCM",
}

describe("greeting-card: nhóm đơn đặt thêm trên cùng link", () => {
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

  async function orderedLink(t: Tenant) {
    const product = await new ProductRepository().create(t.ctx, { code: "HOA-1", name: "Bó hoa hồng", attributes: { price: 500000 } })
    const catalog = await new GreetingCardRepository().createCatalog(t.ctx, { code: "bo-1", name: "Bộ 1", productIds: [product.id], createdBy: t.userId })
    const link = await createSendLink(t.ctx, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, product.id)
    const order = await submitBrochureOrder(link.sendCode, ORDER_INPUT)
    return { product, link, order }
  }

  it("đơn 1 xong → đặt thêm đơn 2 (đã gửi) → đơn 3 đang dở: mở lại link nào cũng thấy cả nhóm và về đơn 3", async () => {
    const first = await orderedLink(a)
    const second = await startAnotherOrder(first.link.sendCode)
    await selectBrochureProduct(second.sendCode, first.product.id)
    await submitBrochureOrder(second.sendCode, ORDER_INPUT)
    const third = await startAnotherOrder(second.sendCode)
    // Tổ chức khác có nhóm riêng — không lẫn vào
    const other = await orderedLink(b)
    await startAnotherOrder(other.link.sendCode)

    const codes = [first.link.sendCode, second.sendCode, third.sendCode]
    for (const from of codes) {
      const family = await getOrderFamily(from)
      expect(family.rootSendCode).toBe(first.link.sendCode)
      expect(family.members.map((m) => m.sendCode)).toEqual(codes)
    }
    const family = await getOrderFamily(first.link.sendCode)
    expect(family.members.map((m) => m.order?.code ?? null)).toEqual([first.order.orderCode, expect.any(String), null])
    expect(family.members[0]?.productName).toBe("Bó hoa hồng")
    // Khách mở lại link đơn 1 (đã xong) trên máy chưa nhớ gì → về đơn 3 đang đặt dở
    expect(familyResumeTarget(family.members, first.link.sendCode, null)).toBe(third.sendCode)
  })

  it("đơn đặt dở có link đã hết hạn thì không tự chuyển tới nó", async () => {
    const first = await orderedLink(a)
    const second = await startAnotherOrder(first.link.sendCode)
    await prisma.greeting_sessions.updateMany({ where: { send_code: second.sendCode }, data: { expires_at: new Date(Date.now() - 60_000) } })
    const family = await getOrderFamily(first.link.sendCode)
    expect(family.members.find((m) => m.sendCode === second.sendCode)?.available).toBe(false)
    expect(familyResumeTarget(family.members, first.link.sendCode, null)).toBeNull()
  })

  it("API lịch sử chỉ trả cho chủ phiên (trình duyệt khác → 404)", async () => {
    const first = await orderedLink(a)
    const res = await historyGET(new Request(`http://localhost/api/v1/public/brochure/${first.link.sendCode}/history`), {
      params: Promise.resolve({ sendCode: first.link.sendCode }),
    })
    expect(res.status).toBe(404)
  })
})
