import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, withSession, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { RoleRepository } from "@/modules/organization/infra/role-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { POST as confirmPost } from "@/app/api/v1/greeting-card/orders/[id]/confirm-payment/route"
import { POST as quotePost } from "@/app/api/v1/greeting-card/orders/[id]/quote/route"
import { GET as paymentEventsGet } from "@/app/api/v1/greeting-card/payment-events/route"
import { PATCH as roleCapsPatch } from "@/app/api/v1/roles/[id]/capabilities/route"

/**
 * PO 08/10/2026 (Q4): chỉ Điều hành — người giữ tài khoản ngân hàng — xác nhận tiền chuyển khoản và
 * báo giá đơn Thẻ chào (R11, trần cứng). Thay quyết định 06/10 "giữ R9 cho Sale/Điều phối".
 * Vai thật, phiên thật, gọi thẳng route: năng lực do máy chủ suy từ vai, không cấy tay.
 */

const DELIVERY = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10)
const ORDER = {
  customerName: "Khách Quen", customerPhone: "0987654321", recipientName: "Người Nhận", recipientPhone: "0912345678",
  confirmedTerms: true, selectedPromotionId: "promo-free-card", deliveryDate: DELIVERY, deliveryTimeSlot: "08:00 - 10:00", deliveryAddress: "1 Lê Lợi, Q1", // ưu đãi tặng kèm — không đổi số tiền bài này kiểm
}
const params = (id: string) => ({ params: Promise.resolve({ id }) })
const url = (path: string) => `http://localhost/api/v1${path}`
const post = (path: string, token: string, body: unknown = {}) =>
  withSession(url(path), token, { method: "POST", body: JSON.stringify(body) })

describe("greeting-card: chỉ Điều hành xác nhận tiền (R11)", () => {
  let a: Tenant
  let b: Tenant
  let orderId: string

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    const product = await new ProductRepository().create(a.ctx, { code: "HOA-1", name: "Bó 1", attributes: { price: 500_000 } })
    const catalog = await new GreetingCardRepository().createCatalog(a.ctx, { code: "bo-1", name: "Bộ 1", productIds: [product.id], createdBy: a.userId })
    const link = await createSendLink({ ...a.ctx, capabilities: new Set(["R2"]) }, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, product.id)
    orderId = (await submitBrochureOrder(link.sendCode, ORDER)).orderId
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("Sale và Điều phối bị chặn 403 khi xác nhận tiền, báo giá, xem giao dịch ngân hàng; đơn không đổi", async () => {
    for (const role of ["sale", "dieu_phoi"] as const) {
      const staff = await addStaffWithSession(a, role, role)
      const confirm = await confirmPost(post(`/greeting-card/orders/${orderId}/confirm-payment`, staff.token), params(orderId))
      expect(confirm.status).toBe(403)
      const quote = await quotePost(post(`/greeting-card/orders/${orderId}/quote`, staff.token, { total_vnd: 900_000 }), params(orderId))
      expect(quote.status).toBe(403)
      const events = await paymentEventsGet(withSession(url("/greeting-card/payment-events"), staff.token))
      expect(events.status).toBe(403)
    }
    const order = await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })
    expect(Number(order.paid_vnd)).toBe(0)
    expect(await prisma.order_payments.count({ where: { order_id: orderId } })).toBe(0)
  })

  it("Điều hành xác nhận được; Điều hành tiệm khác nhận 404, không phải 403", async () => {
    const other = await confirmPost(post(`/greeting-card/orders/${orderId}/confirm-payment`, b.token), params(orderId))
    expect(other.status).toBe(404)

    const res = await confirmPost(post(`/greeting-card/orders/${orderId}/confirm-payment`, a.token), params(orderId))
    expect(res.status).toBe(200)
    const order = await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })
    expect(Number(order.paid_vnd)).toBe(500_000)
  })

  it("không cấp được R11 cho vai Sale qua bảng chỉnh quyền (trần cứng) — không ghi gì", async () => {
    const saleRole = await new RoleRepository().findSystemRoleByKey("sale")
    const res = await roleCapsPatch(
      withSession(url(`/roles/${saleRole!.id}/capabilities`), a.token, {
        method: "PATCH",
        body: JSON.stringify({ changes: [{ code: "R11", allowed: true }] }),
      }),
      params(saleRole!.id)
    )
    expect(res.status).toBe(403)
    expect(await prisma.capability_overrides.count({ where: { organization_id: a.organizationId, capability_code: "R11" } })).toBe(0)

    // Sale vẫn bị chặn sau yêu cầu bị từ chối
    const sale = await addStaffWithSession(a, "sale", "lan")
    const confirm = await confirmPost(post(`/greeting-card/orders/${orderId}/confirm-payment`, sale.token), params(orderId))
    expect(confirm.status).toBe(403)
  })
})
