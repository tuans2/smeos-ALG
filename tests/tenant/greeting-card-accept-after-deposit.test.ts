import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, withSession, type Tenant } from "../helpers/fixtures"
import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/core/tenancy/infra/prisma"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { POST as acceptPost } from "@/app/api/v1/greeting-card/orders/[id]/accept/route"

/**
 * Lỗi 08/11/2026: tiệm 1 cửa hàng cho tự duyệt cọc, Điều hành (R11) bấm "Tiếp nhận" đơn có bill chưa ghi cọc
 * → bước ghi cọc tự nhận đơn (ASSIGNED), rồi bước tiếp nhận ghi tiếp bằng bản đơn đọc TRƯỚC đó → khoá lạc
 * quan không khớp → 409. Vai thật, phiên thật, gọi thẳng route.
 */

const ORDER = {
  customerName: "Khách Quen", customerPhone: "0987654321", recipientName: "Người Nhận", recipientPhone: "0912345678",
  confirmedTerms: true, selectedPromotionId: "promo-free-card", deliveryAddress: "1 Lê Lợi, Q1",
  deliveryDate: new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10), deliveryTimeSlot: "08:00 - 10:00",
}
const params = (id: string) => ({ params: Promise.resolve({ id }) })
const accept = (orderId: string, token: string) =>
  acceptPost(
    withSession(`http://localhost/api/v1/greeting-card/orders/${orderId}/accept`, token, { method: "POST", body: JSON.stringify({}) }),
    params(orderId)
  )

describe("greeting-card: Tiếp nhận đơn có bill chưa ghi cọc (POST /orders/:id/accept)", () => {
  let a: Tenant
  let b: Tenant
  let orderId: string
  let orderCode: string

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    const product = await new ProductRepository().create(a.ctx, { code: "HOA-1", name: "Bó 1", attributes: { price: 500_000 } })
    const catalog = await new GreetingCardRepository().createCatalog(a.ctx, { code: "bo-1", name: "Bộ 1", productIds: [product.id], createdBy: a.userId })
    const link = await createSendLink({ ...a.ctx, capabilities: new Set(["R2"]) }, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, product.id)
    const submitted = await submitBrochureOrder(link.sendCode, ORDER)
    orderId = submitted.orderId
    orderCode = (await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })).code
    const proof = await prisma.assets.create({
      data: {
        id: randomUUID(), organization_id: a.organizationId, kind: "ORIGINAL", state: "READY", version: 1,
        storage_key: `org/${a.organizationId}/unfiled/${randomUUID()}.jpg`, mime_type: "image/jpeg", created_by: a.userId,
      },
    })
    await prisma.greeting_sessions.updateMany({ where: { order_id: orderId }, data: { payment_proof_asset_id: proof.id } })
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function usePolicy(policy: Record<string, unknown>) {
    await prisma.organizations.update({
      where: { id: a.organizationId },
      data: { settings: { brochure_workflow_policy: policy } as Prisma.InputJsonValue },
    })
  }

  it("khoá hành vi: tiệm bắt Điều hành duyệt cọc, Điều phối (không R11) tiếp nhận → 200, không ghi tiền", async () => {
    await usePolicy({ require_admin_deposit_approval: true })
    const coordinator = await addStaffWithSession(a, "dieu_phoi", "dieu-phoi")
    const res = await accept(orderId, coordinator.token)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ data: { orderId, orderCode } })
    const order = await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })
    expect(order).toMatchObject({ production_status: "ASSIGNED", status: "CONFIRMED" })
    expect(Number(order.paid_vnd)).toBe(0)
    expect(await prisma.order_payments.count({ where: { order_id: orderId } })).toBe(0)
  })

  it("Điều hành (R11) tiếp nhận đơn có bill chưa cọc → ghi cọc rồi nhận đơn, 200 (không 409)", async () => {
    await usePolicy({ require_admin_deposit_approval: false })
    const res = await accept(orderId, a.token)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ data: { orderId, orderCode } })

    const order = await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })
    expect(order).toMatchObject({ production_status: "ASSIGNED", status: "CONFIRMED" })
    expect(Number(order.paid_vnd)).toBeGreaterThan(0)
    expect(await prisma.order_payments.count({ where: { order_id: orderId } })).toBe(1)
    // Đúng một lần chuyển WAITING → ASSIGNED, không ghi trùng sự kiện nhận đơn
    const assigned = await prisma.order_events.count({ where: { order_id: orderId, axis: "production", to_value: "ASSIGNED" } })
    expect(assigned).toBe(1)
  })

  it("Điều hành tiệm khác bấm tiếp nhận → 404, đơn không đổi", async () => {
    await usePolicy({ require_admin_deposit_approval: false })
    const res = await accept(orderId, b.token)
    expect(res.status).toBe(404)
    const order = await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })
    expect(order).toMatchObject({ production_status: "WAITING" })
    expect(Number(order.paid_vnd)).toBe(0)
  })
})
