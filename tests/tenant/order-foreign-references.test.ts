import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as createOrder } from "@/app/api/v1/orders/route"
import { CustomerRepository } from "@/modules/crm/infra/customer-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1"

/**
 * Audit BL-13 (06/11/2026): `POST /orders` lưu thẳng `customerId`, `branchId`, `items[].productId` từ body —
 * khoá ngoại không ghép `organization_id`, nên tổ chức A gắn được khách / sản phẩm của tổ chức B vào đơn.
 */
describe("cách ly tenant — id tham chiếu khi tạo đơn", () => {
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

  const post = (t: Tenant, body: Record<string, unknown>) =>
    createOrder(withSession(`${BASE}/orders`, t.token, { method: "POST", body: JSON.stringify(body) }))
  const item = { description: "Bó hoa", quantity: 1, unitPriceVnd: 300_000 }

  it("khách của tổ chức khác → 404, không tạo đơn", async () => {
    const customerB = await prisma.customers.create({ data: { organization_id: b.organizationId, code: "KH-0001", name: "Khách B", phone: "0901234567" } })
    expect((await post(a, { customer_id: customerB.id, items: [item] })).status).toBe(404)
    expect(await prisma.orders.count({ where: { organization_id: a.organizationId } })).toBe(0)
  })

  it("sản phẩm của tổ chức khác trong dòng hàng → 404", async () => {
    const productB = await prisma.products.create({ data: { organization_id: b.organizationId, code: "SP-B", name: "Hoa B" } })
    expect((await post(a, { items: [{ ...item, productId: productB.id }] })).status).toBe(404)
    expect(await prisma.order_items.count()).toBe(0)
  })

  it("khách và sản phẩm của chính mình → tạo được", async () => {
    const customerA = await prisma.customers.create({ data: { organization_id: a.organizationId, code: "KH-0001", name: "Khách A", phone: "0901234568" } })
    const productA = await prisma.products.create({ data: { organization_id: a.organizationId, code: "SP-A", name: "Hoa A" } })
    expect((await post(a, { customer_id: customerA.id, items: [{ ...item, productId: productA.id }] })).status).toBe(201)
  })

  it("đơn giá lẻ, số lượng quá lớn, ngày giao sai dạng → 400", async () => {
    expect((await post(a, { items: [{ ...item, unitPriceVnd: 1000.5 }] })).status).toBe(400)
    expect((await post(a, { items: [{ ...item, quantity: 1000 }] })).status).toBe(400)
    expect((await post(a, { items: [item], delivery_window: { date: "mai giao" } })).status).toBe(400)
  })

  // PO 07/11/2026 (Q5, audit BL-08): mã giảm giá không áp ở đơn chuẩn — trước đây `voucherId` được lưu mà không
  // giảm tiền, không trừ lượt, không kiểm thuộc tổ chức.
  it("voucherId gửi kèm bị bỏ qua: đơn không gắn mã, khách trả đúng giá", async () => {
    const res = await post(a, { voucherId: "ma-cua-ai-do", items: [item] })
    expect(res.status).toBe(201)
    const row = await prisma.orders.findFirstOrThrow({ where: { organization_id: a.organizationId } })
    expect(row.voucher_id).toBeNull()
    expect(Number(row.total_vnd)).toBe(300_000)
  })

  // WP-16 (PO duyệt 07/11/2026): khoá ghép (customer_id, organization_id) — CSDL tự chặn, kể cả khi mã quên kiểm
  it("CSDL từ chối đơn gắn khách của tổ chức khác", async () => {
    const customerB = await prisma.customers.create({ data: { organization_id: b.organizationId, code: "KH-0009", name: "Khách B", phone: "0901234560" } })
    await expect(
      prisma.orders.create({ data: { organization_id: a.organizationId, code: "DH-THU-1", customer_id: customerB.id, total_vnd: 0, balance_vnd: 0, created_by: a.userId } }),
    ).rejects.toThrow()
  })

  it("xoá khách: đơn vẫn còn, chỉ gỡ liên kết khách (như SetNull cũ)", async () => {
    const customerA = await prisma.customers.create({ data: { organization_id: a.organizationId, code: "KH-0010", name: "Khách A", phone: "0901234561" } })
    const res = await post(a, { customer_id: customerA.id, items: [item] })
    expect(res.status).toBe(201)
    expect(await new CustomerRepository().delete(a.ctx, customerA.id)).toBe(true)
    const row = await prisma.orders.findFirstOrThrow({ where: { organization_id: a.organizationId } })
    expect(row.customer_id).toBeNull()
  })
})
