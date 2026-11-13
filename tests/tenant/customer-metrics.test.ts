import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { customersWithChangedOrders, syncCustomerMetrics } from "@/modules/crm/infra/customer-metrics-repository"
import { ingestOrder } from "@/modules/orders/use-cases/ingest-order"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/** PO 07/11/2026 (Q6), audit BL-14: chi tiêu theo thực thu, chỉ trong tổ chức của khách. */
describe("chỉ số khách theo đơn", () => {
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

  it("chi tiêu = tiền đã thu của đơn chưa huỷ; đơn huỷ và phần còn nợ không tính", async () => {
    const customer = await prisma.customers.create({ data: { organization_id: a.organizationId, code: "KH-0001", name: "Lan", phone: "0901234567" } })
    const mk = async (total: number, paid: number, status: "CONFIRMED" | "CANCELLED") => {
      const id = (await ingestOrder(a.ctx, { source: "MANUAL", customerId: customer.id, items: [{ description: "Hoa", quantity: 1, unitPriceVnd: total }] })).id
      await prisma.orders.update({ where: { id }, data: { status, paid_vnd: paid, balance_vnd: total - paid } })
    }
    await mk(8_000_000, 600_000, "CONFIRMED")
    await mk(20_000_000, 20_000_000, "CANCELLED")
    await syncCustomerMetrics(a.organizationId, customer.id)
    const row = await prisma.customers.findUniqueOrThrow({ where: { id: customer.id } })
    expect(Number(row.total_spent)).toBe(600_000)
    expect(row.order_count).toBe(1)
    expect(row.tier).toBe("BRONZE")
  })

  it("không ghi được khách của tổ chức khác; bộ quét thấy khách có đơn đổi ở mọi tổ chức", async () => {
    const customerB = await prisma.customers.create({ data: { organization_id: b.organizationId, code: "KH-0001", name: "Mai", phone: "0901234568" } })
    await syncCustomerMetrics(a.organizationId, customerB.id)
    expect((await prisma.customers.findUniqueOrThrow({ where: { id: customerB.id } })).tier).toBe(customerB.tier)

    await ingestOrder(b.ctx, { source: "MANUAL", customerId: customerB.id, items: [{ description: "Hoa", quantity: 1, unitPriceVnd: 100_000 }] })
    const changed = await customersWithChangedOrders(new Date(Date.now() - 60_000), 10)
    expect(changed.map((r) => [r.organization_id, r.customer_id])).toContainEqual([b.organizationId, customerB.id])
  })
})
