import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as connect } from "@/app/api/v1/integrations/connections/route"
import { GET as getSales } from "@/app/api/v1/integrations/connections/[id]/sales/route"
import { POST as publish } from "@/app/api/v1/integrations/connections/[id]/sales/publish/route"
import { POST as webhook } from "@/app/api/v1/public/integrations/[connector]/[ref]/route"
import { signEcho } from "@/modules/integration-hub/adapters/connectors/test-echo-connector"
import { processDueEvents } from "@/modules/integration-hub/use-cases/process-due-events"
import { SalesChannelRepository } from "@/modules/integration-hub/infra/sales-channel-repository"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1/integrations"
const SECRET = "tenant-shop-secret-0123456789"
const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) })

async function connectShop(t: Tenant) {
  const res = await connect(withSession(`${BASE}/connections`, t.token, { method: "POST", body: JSON.stringify({ connectorKey: "test_shop", secret: SECRET }) }))
  expect(res.status).toBe(201)
  return ((await readJson(res)) as { connection: { id: string; connectionRef: string } }).connection
}

async function sendOrder(ref: string, eventId: string, orderId: string) {
  const body = JSON.stringify({ id: eventId, type: "order.created", orderId })
  const headers = { "x-echo-signature": signEcho(body, SECRET, Math.floor(Date.now() / 1000)) }
  return webhook(new Request(`http://localhost/api/v1/public/integrations/test_shop/${ref}`, { method: "POST", body, headers }), params({ connector: "test_shop", ref }))
}

describe("cách ly tenant — kênh bán hàng (Trung tâm Tích hợp GĐ4A)", () => {
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

  it("đơn từ kênh vào đúng Đơn hàng của tổ chức, nối đúng sản phẩm, gửi lại không tạo đơn trùng", async () => {
    const productA = await prisma.products.create({ data: { organization_id: a.organizationId, code: "HOA-01", name: "Bó hồng", status: "ACTIVE" } })
    await prisma.products.create({ data: { organization_id: b.organizationId, code: "HOA-01", name: "Hoa của B", status: "ACTIVE" } })
    const conn = await connectShop(a)

    expect((await sendOrder(conn.connectionRef, "evt-1", "HOA-01x2")).status).toBe(200)
    expect((await sendOrder(conn.connectionRef, "evt-1", "HOA-01x2")).status).toBe(200)
    expect((await sendOrder(conn.connectionRef, "evt-2", "HOA-01x2")).status).toBe(200) // sự kiện khác, cùng đơn
    await processDueEvents()

    const orders = await prisma.orders.findMany({ include: { items: true } })
    expect(orders).toHaveLength(1)
    expect(orders[0]).toMatchObject({ organization_id: a.organizationId, source: "CHANNEL" })
    expect(orders[0]!.items[0]).toMatchObject({ product_id: productA.id, quantity: 2 })
    const mapping = await prisma.sales_channel_orders.findMany()
    expect(mapping).toHaveLength(1)
    expect(mapping[0]).toMatchObject({ organization_id: a.organizationId, status: "IMPORTED", order_id: orders[0]!.id })
  })

  it("tổ chức khác không xem/không đăng qua kết nối kênh bán của A (404); sản phẩm thiếu giá không đẩy lên kênh", async () => {
    const product = await prisma.products.create({ data: { organization_id: a.organizationId, code: "HOA-02", name: "Lan hồ điệp", status: "ACTIVE" } })
    const conn = await connectShop(a)
    expect((await getSales(withSession(`${BASE}/connections/${conn.id}/sales`, b.token), params({ id: conn.id }))).status).toBe(404)
    const publishB = await publish(
      withSession(`${BASE}/connections/${conn.id}/sales/publish`, b.token, { method: "POST", body: JSON.stringify({ productIds: [product.id] }) }),
      params({ id: conn.id })
    )
    expect(publishB.status).toBe(404)

    const publishA = await publish(
      withSession(`${BASE}/connections/${conn.id}/sales/publish`, a.token, { method: "POST", body: JSON.stringify({ productIds: [product.id] }) }),
      params({ id: conn.id })
    )
    expect(publishA.status).toBe(200)
    const listing = await prisma.sales_channel_listings.findFirstOrThrow()
    expect(listing).toMatchObject({ organization_id: a.organizationId, status: "REJECTED" })
    expect(listing.last_error).toContain("Chưa có giá")
  })

  it("con trỏ kéo đơn (integration_sync_cursors) chỉ đọc được bằng đúng tổ chức của kết nối", async () => {
    const conn = await connectShop(a)
    const repo = new SalesChannelRepository()
    await repo.saveCursorSystem(a.organizationId, conn.id, "orders", "cursor-alpha")
    expect(await repo.cursorSystem(a.organizationId, conn.id, "orders")).toBe("cursor-alpha")
    expect(await repo.cursorSystem(b.organizationId, conn.id, "orders")).toBeNull()
    const row = await prisma.integration_sync_cursors.findFirstOrThrow()
    expect(row.organization_id).toBe(a.organizationId)
  })

  it("audit BL-34: lượt nhập đơn chết giữa chừng (kẹt IN_PROGRESS quá hạn) → lượt sau nhận lại, không mất đơn", async () => {
    const conn = await connectShop(a)
    const repo = new SalesChannelRepository()
    expect(await repo.claimOrderSystem(a.organizationId, conn.id, "SAN-001")).toBe(true)
    expect(await repo.claimOrderSystem(a.organizationId, conn.id, "SAN-001")).toBe(false) // đang nhập thật → trùng
    await prisma.sales_channel_orders.updateMany({ where: { external_order_id: "SAN-001" }, data: { updated_at: new Date(Date.now() - 20 * 60_000) } })
    expect(await repo.claimOrderSystem(a.organizationId, conn.id, "SAN-001")).toBe(true)
    await repo.finishOrderSystem(conn.id, "SAN-001", { orderId: (await prisma.orders.create({ data: { organization_id: a.organizationId, code: "DH261111-0099", total_vnd: 0, balance_vnd: 0, created_by: a.userId } })).id })
    await prisma.sales_channel_orders.updateMany({ where: { external_order_id: "SAN-001" }, data: { updated_at: new Date(Date.now() - 20 * 60_000) } })
    expect(await repo.claimOrderSystem(a.organizationId, conn.id, "SAN-001")).toBe(false) // đã nhập xong → trùng
  })

  it("audit BL-34: tồn theo số lượng cho kênh bán chỉ cộng tồn của chính tổ chức", async () => {
    const pa = await prisma.products.create({ data: { organization_id: a.organizationId, code: "HOA-01", name: "Bó hồng", status: "ACTIVE" } })
    const ba = await prisma.branches.create({ data: { organization_id: a.organizationId, name: "Q1", code: "Q1" } })
    const ba2 = await prisma.branches.create({ data: { organization_id: a.organizationId, name: "Q3", code: "Q3" } })
    await prisma.product_inventory.create({ data: { organization_id: a.organizationId, product_id: pa.id, branch_id: ba.id, quantity_available: 0 } })
    await prisma.product_inventory.create({ data: { organization_id: a.organizationId, product_id: pa.id, branch_id: ba2.id, quantity_available: 2 } })
    const repo = new SalesChannelRepository()
    expect(await repo.trackedStock(a.ctx, [pa.id])).toEqual(new Map([[pa.id, 2]]))
    expect(await repo.trackedStock(b.ctx, [pa.id])).toEqual(new Map())
  })
})
