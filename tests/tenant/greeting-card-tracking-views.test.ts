import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { TenantContext } from "@/core/tenancy"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { RoleRepository } from "@/modules/organization/infra/role-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { adminConfirmBrochurePayment } from "@/modules/greeting-card/use-cases/confirm-brochure-payment"
import { queryTracking, type TrackingQueryParams } from "@/modules/greeting-card/use-cases/query-tracking"
import { getTrackingTimeline } from "@/modules/greeting-card/use-cases/get-tracking-timeline"
import { GET as trackingGet } from "@/app/api/v1/greeting-card/tracking/route"
import { GET as timelineGet } from "@/app/api/v1/greeting-card/tracking/timeline/route"

/**
 * Multi-view "Theo dõi tiến độ" (06/10/2026): một đơn thật → cùng một đối tượng xuất hiện đúng
 * trong Kanban, Danh sách, Lịch, Dòng thời gian, Công việc, Dashboard — không bản sao, cùng phạm vi.
 */

const DELIVERY = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10)
const ORDER = {
  customerName: "Khách Quen", customerPhone: "0987654321", recipientName: "Người Nhận", recipientPhone: "0912345678",
  confirmedTerms: true, selectedPromotionId: "promo-free-card", // ưu đãi tặng kèm — không đổi số tiền bài này kiểm
  deliveryDate: DELIVERY, deliveryTimeSlot: "08:00 - 10:00", deliveryAddress: "1 Lê Lợi, Q1",
}
const base = (view: TrackingQueryParams["view"]): TrackingQueryParams => ({ view, filter: {}, sort: { field: "urgency", dir: "desc" }, limit: 20 })

async function codeOf(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p
    return undefined
  } catch (err) {
    return (err as { code?: string }).code
  }
}

describe("greeting-card: multi-view theo dõi tiến độ", () => {
  let a: Tenant
  let owner: TenantContext
  let lan: TenantContext

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    owner = { ...a.ctx, capabilities: new Set(["R1", "R2", "R4", "R9", "F2"]) }
    const saleRole = await new RoleRepository().findSystemRoleByKey("sale")
    const user = await prisma.users.create({ data: { id: randomUUID(), email: `lan-${randomUUID()}@vi-du.test`, name: "Lan" } })
    await prisma.memberships.create({ data: { id: randomUUID(), organization_id: a.organizationId, user_id: user.id, role_id: saleRole!.id, status: "ACTIVE", joined_at: new Date() } })
    lan = { ...a.ctx, userId: user.id, capabilities: new Set(["R1", "R2", "R9"]) }
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function placeOrder() {
    const product = await new ProductRepository().create(a.ctx, { code: "HOA-1", name: "Bó 1", attributes: { price: 500_000 } })
    const catalog = await new GreetingCardRepository().createCatalog(a.ctx, { code: "bo-1", name: "Bộ 1", productIds: [product.id], createdBy: a.userId })
    const link = await createSendLink(owner, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, product.id)
    return submitBrochureOrder(link.sendCode, ORDER)
  }

  it("một đơn → đúng cột Kanban, đúng dòng Danh sách, đúng ngày Lịch, cùng vòng đời ở Dòng thời gian", async () => {
    const order = await placeOrder()

    const list = await queryTracking(owner, base("list"))
    expect(list.view === "list" && list.data.map((i) => i.orderId)).toEqual([order.orderId])
    const row = list.view === "list" ? list.data[0]! : null
    expect(row).toMatchObject({ currentStepId: "STEP_3_FILLING_FORM", totalVnd: 500_000, deliveryDate: DELIVERY })

    const kanban = await queryTracking(owner, base("kanban"))
    const col = kanban.view === "kanban" ? kanban.columns.find((c) => c.stepId === "STEP_3_FILLING_FORM") : null
    expect(col?.count).toBe(1)
    expect(col?.items[0]?.id).toBe(row?.id) // cùng một đối tượng, không bản sao
    expect(kanban.view === "kanban" && kanban.columns.reduce((s, c) => s + c.count, 0)).toBe(1)

    const cal = await queryTracking(owner, { ...base("calendar"), from: DELIVERY, to: DELIVERY })
    expect(cal.view === "calendar" && cal.days).toEqual([
      expect.objectContaining({ date: DELIVERY, count: 1, slots: [expect.objectContaining({ slot: "08:00 - 10:00" })] }),
    ])

    await adminConfirmBrochurePayment(owner, order.orderId)
    const after = await queryTracking(owner, base("kanban"))
    expect(after.view === "kanban" && after.columns.find((c) => c.count > 0)?.stepId).toBe("STEP_5_PAYMENT_CONFIRMED")

    const tl = await getTrackingTimeline(owner, { orderId: order.orderId }, { limit: 50 })
    expect(tl.segments.map((s) => s.stepId)).toEqual(["STEP_1_OPENED", "STEP_3_FILLING_FORM", "STEP_5_PAYMENT_CONFIRMED"])
    expect(tl.events.data.map((e) => e.kind)).toEqual(expect.arrayContaining(["SUBMIT_ORDER", "PAYMENT_FIRST", "PAYMENT"]))
  })

  it("đơn quá thời gian chuẩn → vào Công việc, Dashboard đếm quá hạn, Dòng thời gian ghi vượt bao lâu", async () => {
    const order = await placeOrder()
    // Bước 3 có thời gian chuẩn 15 phút — lùi mốc đơn 2 giờ
    const twoHoursAgo = new Date(Date.now() - 2 * 3_600_000)
    await prisma.orders.update({ where: { id: order.orderId }, data: { created_at: twoHoursAgo } })

    const queue = await queryTracking(owner, base("queue"))
    expect(queue.view === "queue" && queue.data.map((i) => [i.orderId, i.sla.state])).toEqual([[order.orderId, "OVERDUE"]])

    const dash = await queryTracking(owner, base("dashboard"))
    expect(dash.view === "dashboard" && dash).toMatchObject({ total: 1, orders: 1, overdue: 1 })
    expect(dash.view === "dashboard" && dash.byStep.find((s) => s.stepId === "STEP_3_FILLING_FORM")).toMatchObject({ count: 1, overdue: 1 })

    const tl = await getTrackingTimeline(owner, { orderId: order.orderId }, { limit: 50 })
    expect(tl.segments.at(-1)).toMatchObject({ stepId: "STEP_3_FILLING_FORM", slaMinutes: 15 })
    expect(tl.segments.at(-1)!.overMinutes).toBeGreaterThan(90)

    // Lọc chung áp cho mọi view: lọc theo bước khác → Danh sách và Dashboard cùng rỗng
    const other = { ...base("list"), filter: { steps: ["STEP_6_ARRANGING" as const] } }
    expect((await queryTracking(owner, other)).view === "list" && (await queryTracking(owner, other))).toMatchObject({ total: 0 })
    expect(await queryTracking(owner, { ...other, view: "dashboard" })).toMatchObject({ total: 0 })
  })

  it("cùng phạm vi xem ở mọi view: sale 'chỉ khách của mình' không thấy đơn người khác, kể cả dòng thời gian", async () => {
    const order = await placeOrder()
    await prisma.organizations.update({ where: { id: a.organizationId }, data: { settings: { brochure_visibility: { mode: "OWN", members: {} } } } })
    for (const view of ["list", "kanban", "queue", "dashboard"] as const) {
      const r = await queryTracking(lan, base(view))
      const total = "total" in r ? r.total : 0
      expect(total).toBe(0)
    }
    expect(await codeOf(getTrackingTimeline(lan, { orderId: order.orderId }, { limit: 50 }))).toBe("NOT_FOUND")
  })

  it("API trả dạng danh sách phân trang chung: `data` là mảng dòng có `sla` (giao diện Danh sách/Timeline đọc thẳng)", async () => {
    const order = await placeOrder()
    const list = await (await trackingGet(withSession("http://localhost/api/v1/greeting-card/tracking?view=list&limit=20", a.token))).json()
    expect(Array.isArray(list.data)).toBe(true)
    expect(list.data[0]).toMatchObject({ orderId: order.orderId, sla: expect.objectContaining({ state: expect.any(String) }) })
    expect(list).toMatchObject({ next_cursor: null, total: 1 })

    const kanban = await (await trackingGet(withSession("http://localhost/api/v1/greeting-card/tracking?view=kanban", a.token))).json()
    expect(Array.isArray(kanban.data.columns)).toBe(true)

    const tl = await (await timelineGet(withSession(`http://localhost/api/v1/greeting-card/tracking/timeline?order_id=${order.orderId}`, a.token))).json()
    expect(Array.isArray(tl.data)).toBe(true)
    expect(tl.segments.length).toBeGreaterThan(0)
  })
})
