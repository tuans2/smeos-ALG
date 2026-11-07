import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as postCancel } from "@/app/api/v1/orders/[id]/cancel/route"
import { ingestOrder } from "@/modules/orders/use-cases/ingest-order"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"

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
})
