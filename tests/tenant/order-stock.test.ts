import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as postCancel } from "@/app/api/v1/orders/[id]/cancel/route"
import { POST as postOrder } from "@/app/api/v1/orders/route"
import { POST as postCoordinatorOrder } from "@/app/api/v1/coordinator/orders/route"
import { POST as postCoordinatorCancel } from "@/app/api/v1/coordinator/orders/[id]/cancel/route"
import { ingestOrder } from "@/modules/orders/use-cases/ingest-order"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1"

/** PO 07/11/2026 (kế hoạch logic nghiệp vụ Q9), audit BL-16: tồn theo số lượng giảm khi bán, hoàn khi huỷ. */
describe("tồn kho theo số lượng", () => {
  let a: Tenant
  let productId: string
  let branchId: string

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    productId = (await prisma.products.create({ data: { organization_id: a.organizationId, code: "SP-1", name: "Bình gốm" } })).id
    branchId = (await prisma.branches.create({ data: { organization_id: a.organizationId, name: "Quận 1", code: "Q1" } })).id
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  const stock = async () => (await prisma.product_inventory.findFirstOrThrow({ where: { product_id: productId } })).quantity_available
  const order = (quantity: number) =>
    ingestOrder(a.ctx, { source: "MANUAL", branchId, items: [{ productId, description: "Bình gốm", quantity, unitPriceVnd: 0 }] })

  it("tạo đơn trừ tồn; thiếu hàng → 409, không tạo đơn; huỷ → hoàn đúng một lần", async () => {
    await prisma.product_inventory.create({ data: { organization_id: a.organizationId, product_id: productId, branch_id: branchId, quantity_available: 3 } })
    const first = await order(2)
    expect(await stock()).toBe(1)
    await expect(order(2)).rejects.toMatchObject({ code: "CONFLICT" })
    expect(await stock()).toBe(1)
    expect(await prisma.orders.count({ where: { organization_id: a.organizationId } })).toBe(1)

    const cancel = () =>
      postCancel(withSession(`${BASE}/orders/${first.id}/cancel`, a.token, { method: "POST", body: JSON.stringify({ reason: "Khách đổi ý" }) }), { params: Promise.resolve({ id: first.id }) })
    expect((await cancel()).status).toBe(200)
    expect(await stock()).toBe(3)
    expect((await cancel()).status).toBe(422) // đã huỷ — không hoàn lần hai
    expect(await stock()).toBe(3)
  })

  it("sản phẩm không theo dõi số lượng (quantity_available rỗng) → không trừ, không chặn", async () => {
    await prisma.product_inventory.create({ data: { organization_id: a.organizationId, product_id: productId, branch_id: branchId, quantity_available: null } })
    await order(50)
    expect(await stock()).toBeNull()
  })

  it("audit BL-19: dấu trừ tồn giả trong metadata client → huỷ đơn không cộng tồn", async () => {
    const inv = await prisma.product_inventory.create({ data: { organization_id: a.organizationId, product_id: productId, branch_id: branchId, quantity_available: 3 } })
    const res = await postOrder(withSession(`${BASE}/orders`, a.token, {
      method: "POST",
      body: JSON.stringify({
        branchId,
        deliveryAddress: { recipientName: "Trần Thị Bình", phone: "0901 234 567", street: "12 Lê Lợi" },
        items: [{ description: "Phí gói quà", quantity: 1, unitPriceVnd: 20_000, metadata: { note: "giấy kraft", stock: { inventoryId: inv.id, quantity: 500 } } }],
      }),
    }))
    expect(res.status).toBe(201)
    const id = ((await readJson(res)).order as { id: string }).id
    const item = await prisma.order_items.findFirstOrThrow({ where: { order_id: id } })
    expect(item.metadata).toEqual({ note: "giấy kraft" })

    const cancel = await postCancel(withSession(`${BASE}/orders/${id}/cancel`, a.token, { method: "POST", body: JSON.stringify({ reason: "Khách đổi ý" }) }), { params: Promise.resolve({ id }) })
    expect(cancel.status).toBe(200)
    expect(await stock()).toBe(3)
  })

  it("audit BL-20: tạo đơn ở Điều phối trừ tồn; thiếu hàng → 409; huỷ ở Điều phối → hoàn", async () => {
    await prisma.product_inventory.create({ data: { organization_id: a.organizationId, product_id: productId, branch_id: branchId, quantity_available: 1 } })
    const body = {
      productId, customerName: "Nguyễn Văn An", recipientName: "Trần Thị Bình", recipientPhone: "0901 234 567",
      deliveryAddress: { street: "123 Phố Huế", ward: "Ngô Thì Nhậm", district: "Hai Bà Trưng", city: "Hà Nội" }, deliveryTargetTime: "17:00",
      deliveryTargetAt: new Date(Date.now() + 6 * 3600_000).toISOString(), productTitle: "Bình gốm", unitPriceVnd: 300_000, flowers: [],
    }
    const create = () => postCoordinatorOrder(withSession(`${BASE}/coordinator/orders`, a.token, { method: "POST", body: JSON.stringify(body) }))
    const first = await create()
    expect(first.status).toBe(201)
    expect(await stock()).toBe(0)
    expect((await create()).status).toBe(409)
    expect(await stock()).toBe(0)

    const id = ((await readJson(first)).order as { id: string }).id
    // Audit BL-36: dòng hàng mang đơn giá thật (trước ghi 0 ₫ — phiếu in, xuất đơn, báo cáo sản phẩm sai)
    expect(Number((await prisma.order_items.findFirstOrThrow({ where: { order_id: id } })).unit_price_vnd)).toBe(300_000)
    const cancel = await postCoordinatorCancel(
      withSession(`${BASE}/coordinator/orders/${id}/cancel`, a.token, { method: "POST", body: JSON.stringify({ reason: "Khách đổi ý" }) }),
      { params: Promise.resolve({ id }) },
    )
    expect(cancel.status).toBe(200)
    expect(await stock()).toBe(1)
  })

  it("audit BL-26: đơn không gắn chi nhánh, tồn ở 2 chi nhánh → trừ ở chi nhánh còn nhiều hàng nhất; huỷ hoàn đúng chỗ", async () => {
    const other = (await prisma.branches.create({ data: { organization_id: a.organizationId, name: "Quận 3", code: "Q3" } })).id
    await prisma.product_inventory.create({ data: { organization_id: a.organizationId, product_id: productId, branch_id: branchId, quantity_available: 2 } })
    await prisma.product_inventory.create({ data: { organization_id: a.organizationId, product_id: productId, branch_id: other, quantity_available: 5 } })
    const byBranch = async () =>
      Object.fromEntries((await prisma.product_inventory.findMany({ where: { product_id: productId } })).map((r) => [r.branch_id, r.quantity_available]))

    const created = await ingestOrder(a.ctx, { source: "MANUAL", items: [{ productId, description: "Bình gốm", quantity: 3, unitPriceVnd: 0 }] })
    expect(await byBranch()).toEqual({ [branchId]: 2, [other]: 2 })

    const cancel = await postCancel(withSession(`${BASE}/orders/${created.id}/cancel`, a.token, { method: "POST", body: JSON.stringify({ reason: "Khách đổi ý" }) }), { params: Promise.resolve({ id: created.id }) })
    expect(cancel.status).toBe(200)
    expect(await byBranch()).toEqual({ [branchId]: 2, [other]: 5 })
  })
})
