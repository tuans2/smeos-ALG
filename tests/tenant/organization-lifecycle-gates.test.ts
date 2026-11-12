import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { listOrganizationsWithOpenOrders } from "@/modules/coordinator/infra/delivery-reminder-sweep-query"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { EventRepository } from "@/modules/integration-hub/infra/event-repository"
import { SalesChannelRepository } from "@/modules/integration-hub/infra/sales-channel-repository"
import { setOrganizationLifecycle } from "@/modules/platform/use-cases/set-organization-lifecycle"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { SocialPostRepository } from "@/modules/social-publishing/infra/social-post-repository"
import { listSubscriptionsToCheck } from "@/modules/subscription/infra/subscription-sweep-query"
import { assertAcceptingPublicOrders, PUBLIC_ORDERS_PAUSED_MESSAGE } from "@/modules/subscription/use-cases/public-order-guard"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

const pctx = { userId: "platform-admin", capabilities: new Set(["N2"]) }
const DAY = 24 * 60 * 60 * 1000

/**
 * Audit User Journey UJ-26 (R2-01), PO 12/11/2026 (UQ13): tổ chức tạm ngưng / đang rời nền tảng không nhận đơn qua link
 * công khai và không chạy tác vụ nền gửi ra ngoài (đăng bài, kéo đơn kênh bán, xử lý sự kiện tích hợp, nhắc giao, hoá
 * đơn gói). Tổ chức khác vẫn chạy bình thường. Trước đây chỉ phiên đăng nhập và khoá tích hợp bị chặn.
 */
describe("tổ chức không hoạt động — cửa vào công khai và tác vụ nền", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("cong-a")
    b = await createTenant("cong-b")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  const suspend = (t: Tenant) => setOrganizationLifecycle(pctx, { organizationId: t.organizationId, status: "SUSPENDED" })
  const offboard = (t: Tenant) => setOrganizationLifecycle(pctx, { organizationId: t.organizationId, status: "OFFBOARDING", offboardingUntil: new Date(Date.now() + 30 * DAY) })

  it("đặt đơn công khai: tổ chức tạm ngưng / rời nền tảng → từ chối với câu dành cho khách; tổ chức khác vẫn nhận", async () => {
    await suspend(a)
    await expect(assertAcceptingPublicOrders(a.organizationId)).rejects.toMatchObject({ code: "ORGANIZATION_INACTIVE", message: PUBLIC_ORDERS_PAUSED_MESSAGE })
    await offboard(b)
    await expect(assertAcceptingPublicOrders(b.organizationId)).rejects.toMatchObject({ code: "ORGANIZATION_INACTIVE" })
    await setOrganizationLifecycle(pctx, { organizationId: b.organizationId, status: "ACTIVE" })
    await expect(assertAcceptingPublicOrders(b.organizationId)).resolves.toBeUndefined()
  })

  it("đơn Thẻ chào của tổ chức tạm ngưng không được tạo", async () => {
    const product = await new ProductRepository().create(a.ctx, { code: "HOA-1", name: "Bó 1", attributes: { price: 500_000 } })
    const catalog = await new GreetingCardRepository().createCatalog(a.ctx, { code: "bo-1", name: "Bộ 1", productIds: [product.id], createdBy: a.userId })
    const link = await createSendLink(a.ctx, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, product.id)
    await suspend(a)
    await expect(submitBrochureOrder(link.sendCode, {
      customerName: "Khách Quen", customerPhone: "0987 654 321", recipientName: "Người Nhận", recipientPhone: "0912 345 678",
      confirmedTerms: true, selectedPromotionId: "promo-discount-10", deliveryDate: new Date(Date.now() + 10 * DAY).toISOString().slice(0, 10), deliveryAddress: "1 Lê Lợi, Q1",
    })).rejects.toMatchObject({ code: "ORGANIZATION_INACTIVE" })
    expect(await prisma.orders.count({ where: { organization_id: a.organizationId } })).toBe(0)
  })

  it("tác vụ nền gửi ra ngoài bỏ qua tổ chức không hoạt động, vẫn chạy cho tổ chức khác", async () => {
    const now = new Date()
    const past = new Date(now.getTime() - 60_000)
    const seed = async (t: Tenant) => {
      await prisma.social_posts.create({
        data: { organization_id: t.organizationId, channel: "facebook", text: "Bài hẹn giờ", hashtags: [], media_asset_ids: [], scheduled_at: past, idempotency_key: randomUUID(), created_by: t.userId },
      })
      const conn = await prisma.integration_connections.create({
        data: { organization_id: t.organizationId, connector_key: "test_sales", scope_tier: "STORE", display_name: "Sàn", status: "ACTIVE", connection_ref: randomUUID(), created_by: t.userId },
      })
      await prisma.integration_events.create({ data: { organization_id: t.organizationId, connection_id: conn.id, direction: "IN", event_type: "order.created" } })
      await prisma.orders.create({ data: { organization_id: t.organizationId, code: `DH-${randomUUID().slice(0, 6)}`, source: "MANUAL", status: "CONFIRMED", total_vnd: 0, paid_vnd: 0, balance_vnd: 0, created_by: t.userId } })
      await prisma.subscriptions.create({
        data: { organization_id: t.organizationId, plan: "STARTER", cycle: "MONTHLY", price_vnd: 300_000, status: "ACTIVE", current_period_start: new Date(now.getTime() - 27 * DAY), current_period_end: new Date(now.getTime() + 3 * DAY) },
      })
    }
    await seed(a)
    await seed(b)
    await suspend(a)

    const orgsOf = (rows: { organization_id?: string; organizationId?: string }[]) => [...new Set(rows.map((r) => r.organization_id ?? r.organizationId))]
    expect(orgsOf(await new SocialPostRepository().listDue(now, 50))).toEqual([b.organizationId])
    const conns = await new SalesChannelRepository().activeSalesConnectionsSystem(["test_sales"], 50)
    expect(orgsOf(await prisma.integration_connections.findMany({ where: { id: { in: conns.map((c) => c.id) } } }))).toEqual([b.organizationId])
    expect(orgsOf(await new EventRepository().listDue(now, 50))).toEqual([b.organizationId])
    expect(await listOrganizationsWithOpenOrders(now, 50)).toEqual([b.organizationId])
    const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`
    expect((await listSubscriptionsToCheck(now, period, 50)).map((r) => r.organizationId)).toEqual([b.organizationId])
  })
})
