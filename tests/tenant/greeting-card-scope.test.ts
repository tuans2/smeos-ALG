import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { TenantContext } from "@/core/tenancy"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { RoleRepository } from "@/modules/organization/infra/role-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { adminConfirmBrochurePayment, quoteBrochureOrder } from "@/modules/greeting-card/use-cases/confirm-brochure-payment"
import { listPaymentEvents, markPaymentEventHandled } from "@/modules/greeting-card/use-cases/payment-webhook"
import { getSalesFunnel } from "@/modules/greeting-card/use-cases/get-sales-funnel"
import { getChannelFunnel } from "@/modules/greeting-card/use-cases/catalog-channel-events"
import { getTrackingPipeline } from "@/modules/greeting-card/use-cases/get-tracking-pipeline"
import { assignBrochureFlorist } from "@/modules/greeting-card/use-cases/update-brochure-order-status"
import { updateOrderProgress } from "@/modules/orders/use-cases/update-order-progress"
import { cancelOrder } from "@/modules/orders/use-cases/cancel-order"

/**
 * Phạm vi xem "chỉ khách của mình" áp cho thao tác tiền và phễu (PO 06/10/2026):
 * sale vẫn ghi thu được (R9) nhưng chỉ trên đơn của mình; phễu tính tiền thật đã thu.
 */

const ORDER = {
  customerName: "Khách Quen", customerPhone: "0987654321", recipientName: "Người Nhận", recipientPhone: "0912345678",
  confirmedTerms: true, selectedPromotionId: "promo-free-card", // ưu đãi tặng kèm — không đổi số tiền bài này kiểm
  deliveryDate: new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10), deliveryAddress: "1 Lê Lợi, Q1",
}

async function codeOf(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p
    return undefined
  } catch (err) {
    return (err as { code?: string }).code
  }
}

describe("greeting-card: phạm vi xem cho tiền và phễu", () => {
  let a: Tenant
  let lan: TenantContext
  let mai: TenantContext
  let owner: TenantContext

  async function sale(name: string): Promise<TenantContext> {
    const saleRole = await new RoleRepository().findSystemRoleByKey("sale")
    const user = await prisma.users.create({ data: { id: randomUUID(), email: `${name}-${randomUUID()}@vi-du.test`, name } })
    await prisma.memberships.create({ data: { id: randomUUID(), organization_id: a.organizationId, user_id: user.id, role_id: saleRole!.id, status: "ACTIVE", joined_at: new Date() } })
    return { ...a.ctx, userId: user.id, capabilities: new Set(["R1", "R2", "R9"]) }
  }

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    lan = await sale("lan")
    mai = await sale("mai")
    owner = { ...a.ctx, capabilities: new Set(["R1", "R2", "R4", "R6", "R9", "R10", "F2"]) }
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function orderBy(seller: TenantContext, price: number | null, code: string) {
    const product = await new ProductRepository().create(a.ctx, { code, name: `Bó ${code}`, attributes: price ? { price } : {} })
    const catalog = await new GreetingCardRepository().createCatalog(a.ctx, { code: code.toLowerCase(), name: `Bộ ${code}`, productIds: [product.id], createdBy: a.userId })
    const link = await createSendLink(seller, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, product.id)
    return submitBrochureOrder(link.sendCode, ORDER)
  }

  const ownMode = () =>
    prisma.organizations.update({ where: { id: a.organizationId }, data: { settings: { brochure_visibility: { mode: "OWN", members: {} } } } })

  it("sale 'chỉ khách của mình' không thu tiền / báo giá được đơn của sale khác (404), đơn của mình thì được", async () => {
    const lanOrder = await orderBy(lan, 500_000, "L1")
    const maiOrder = await orderBy(mai, null, "M1")
    await ownMode()

    expect(await codeOf(adminConfirmBrochurePayment(mai, lanOrder.orderId))).toBe("NOT_FOUND")
    expect(await codeOf(quoteBrochureOrder(lan, maiOrder.orderId, 700_000))).toBe("NOT_FOUND")
    expect((await adminConfirmBrochurePayment(lan, lanOrder.orderId)).paidVnd).toBe(500_000)
    // Điều hành luôn thấy mọi đơn
    expect((await quoteBrochureOrder(owner, maiOrder.orderId, 700_000)).totalVnd).toBe(700_000)
  })

  it("sale 'chỉ khách của mình' không xem / xử lý tiền chưa khớp; Điều hành thì được", async () => {
    const event = await prisma.greeting_payment_events.create({
      data: { organization_id: a.organizationId, provider: "SEPAY", external_id: "x1", amount_vnd: 100_000, content: "CK", status: "UNMATCHED" },
    })
    await ownMode()
    expect(await listPaymentEvents(lan, { status: "UNMATCHED", limit: 20 })).toHaveLength(0)
    expect(await codeOf(markPaymentEventHandled(lan, event.id, "đã hoàn"))).toBe("NOT_FOUND")
    expect(await listPaymentEvents(owner, { status: "UNMATCHED", limit: 20 })).toHaveLength(1)
    expect(await markPaymentEventHandled(owner, event.id, "đã hoàn")).toEqual({ handled: true })
  })

  it("phễu: đơn mới cọc chưa tính 'thu đủ', tiền đã thu là số thật; sale OWN chỉ thấy dòng của mình", async () => {
    const lanOrder = await orderBy(lan, 1_000_000, "L2")
    await orderBy(mai, 400_000, "M2")
    await adminConfirmBrochurePayment(owner, lanOrder.orderId, { amountVnd: 300_000 })

    const all = await getSalesFunnel(owner, 30)
    const lanRow = all.rows.find((r) => r.saleId === lan.userId)!
    expect(lanRow).toMatchObject({ ordered: 1, paid: 0, revenueVnd: 300_000 })

    await adminConfirmBrochurePayment(owner, lanOrder.orderId, { amountVnd: 700_000 })
    expect((await getSalesFunnel(owner, 30)).rows.find((r) => r.saleId === lan.userId)).toMatchObject({ paid: 1, revenueVnd: 1_000_000 })

    await ownMode()
    const mine = await getSalesFunnel(lan, 30)
    expect(mine.rows.map((r) => r.saleId)).toEqual([lan.userId])
    expect((await getChannelFunnel(lan, 30)).rows).toEqual([])
  })

  it("bảng theo dõi không bỏ sót đơn cũ còn việc khi có nhiều đơn mới hơn; đơn xong lâu thì rời bảng", async () => {
    const stuck = await orderBy(lan, 500_000, "CU")
    await prisma.orders.update({ where: { id: stuck.orderId }, data: { created_at: new Date(Date.now() - 20 * 86_400_000) } })
    const old = new Date(Date.now() - 30 * 86_400_000)
    // 150 đơn MỚI HƠN đã hoàn tất từ lâu — bản cũ chỉ lấy 100 đơn mới nhất nên đơn kẹt ở trên rơi mất
    await prisma.orders.createMany({
      data: Array.from({ length: 150 }, (_, i) => ({
        id: randomUUID(), organization_id: a.organizationId, code: `DH-XONG-${i}`, source: "BROCHURE", status: "COMPLETED" as const,
        delivery_status: "DELIVERED" as const, total_vnd: 100_000, paid_vnd: 100_000, balance_vnd: 0, created_by: "test",
        created_at: new Date(Date.now() - 1_000 * i), updated_at: old,
      })),
    })
    const pipeline = await getTrackingPipeline(owner)
    expect(pipeline.some((i) => i.orderId === stuck.orderId)).toBe(true)
    expect(pipeline.filter((i) => i.type === "ORDER")).toHaveLength(1)
  })

  it("tác vụ xưởng ghi nhật ký kiểm toán (ai, lúc nào, đổi gì)", async () => {
    const order = await orderBy(lan, 500_000, "XU")
    await assignBrochureFlorist(owner, order.orderId, { floristNote: "Thợ Mai" })
    const audit = await prisma.audit_logs.findFirstOrThrow({ where: { organization_id: a.organizationId, action: "greeting_card.order.florist_assigned" } })
    expect(audit).toMatchObject({ entity_id: order.orderId, user_id: owner.userId })
  })

  it("sổ đơn chung không sửa / huỷ được đơn Thẻ chào (409) — tránh lách luật thu tiền và báo khách", async () => {
    const order = await orderBy(lan, 500_000, "SO")
    expect(await codeOf(updateOrderProgress(owner, order.orderId, { status: "CONFIRMED" }))).toBe("CONFLICT")
    expect(await codeOf(cancelOrder(owner, order.orderId, "thử huỷ"))).toBe("CONFLICT")
    expect((await prisma.orders.findUniqueOrThrow({ where: { id: order.orderId } })).status).toBe("DRAFT")
  })
})
