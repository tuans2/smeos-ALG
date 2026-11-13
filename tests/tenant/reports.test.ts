import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as ordersRoute } from "@/app/api/v1/reports/orders/route"
import { GET as revenueRoute } from "@/app/api/v1/reports/revenue/route"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { TenantContext } from "@/core/tenancy"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import {
  getCashflowReport, getOrderReport, getPerformanceReport, getProductReport, getRevenueReport,
} from "@/modules/reporting/use-cases/reports"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Đợt 5 (checklist ALG 6.1, 6.2, 6.3, 6.5, 6.6) — báo cáo theo kỳ khớp bộ đơn mẫu; tổ chức khác không lẫn;
 * người bị giới hạn chi nhánh chỉ thấy chi nhánh mình; thiếu R20 → 403; kỳ sai → 400.
 */
const DAY = "2026-10-20"
const at = (h: number) => new Date(`${DAY}T${String(h).padStart(2, "0")}:00:00+07:00`)
const Q = { from: "2026-10-01", to: "2026-10-31", granularity: "day" }

describe("báo cáo theo kỳ", () => {
  let a: Tenant
  let b: Tenant
  let seq = 0
  const can = (t: Tenant, extra: Partial<TenantContext> = {}): TenantContext => ({ ...t.ctx, capabilities: new Set(["R20"]), ...extra })

  async function order(t: Tenant, o: { status: string; total: number; branchId?: string | null; slot?: string; deliveredAt?: Date; shipperPhone?: string; createdBy?: string }) {
    seq += 1
    const row = await prisma.orders.create({
      data: {
        organization_id: t.organizationId, code: `BC-${seq}`, status: o.status as never, total_vnd: o.total, balance_vnd: o.total,
        created_by: o.createdBy ?? t.userId, created_at: at(7), branch_id: o.branchId ?? null,
        delivery_window: { date: DAY, timeSlot: o.slot ?? "08:00 - 10:00" },
      },
    })
    if (o.deliveredAt) {
      await prisma.order_events.create({ data: { organization_id: t.organizationId, order_id: row.id, axis: "delivery", to_value: "DELIVERED", created_at: o.deliveredAt } })
    }
    if (o.shipperPhone) await prisma.order_coordinations.create({ data: { organization_id: t.organizationId, order_id: row.id, shipper_phone: o.shipperPhone } })
    return row
  }

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("bc-a")
    b = await createTenant("bc-b")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("6.1 + 6.2: số đơn, hoàn tất, huỷ, trễ; doanh thu dự kiến và thực thu; B không lẫn", async () => {
    const o1 = await order(a, { status: "COMPLETED", total: 500_000, deliveredAt: at(9) })
    await order(a, { status: "DELIVERED", total: 300_000, deliveredAt: at(11) })
    await order(a, { status: "CANCELLED", total: 200_000 })
    await order(b, { status: "COMPLETED", total: 9_000_000, deliveredAt: at(9) })
    await order(b, { status: "DRAFT", total: 700_000 }) // audit BL-30: Nháp không vào dự kiến
    await prisma.order_payments.create({ data: { organization_id: a.organizationId, order_id: o1.id, kind: "DEPOSIT", amount_vnd: 400_000, payment_method: "BANK_TRANSFER", collected_by: a.userId, collected_at: at(8) } })
    await prisma.order_payments.create({ data: { organization_id: a.organizationId, order_id: o1.id, kind: "REFUND", amount_vnd: 50_000, payment_method: "BANK_TRANSFER", collected_by: a.userId, collected_at: at(12) } })
    await prisma.order_payments.create({ data: { organization_id: a.organizationId, order_id: o1.id, kind: "BALANCE", amount_vnd: 100_000, payment_method: "CASH", collected_by: a.userId, collected_at: at(12), status: "PENDING_CONFIRMATION" } })

    const orders = await getOrderReport(can(a), Q)
    expect(orders.totals).toMatchObject({ total: 3, completed: 2, cancelled: 1, delivered: 2, late: 1, lateRate: 50 })
    const revenue = await getRevenueReport(can(a), { ...Q, detail: "orders" })
    expect(revenue.totals).toMatchObject({ expectedVnd: 800_000, collectedVnd: 400_000, refundedVnd: 50_000, netCollectedVnd: 350_000 })
    expect("orders" in revenue && revenue.orders.map((o) => o.totalVnd).sort()).toEqual([300_000, 500_000])
    expect((await getRevenueReport(can(b), Q)).totals).toMatchObject({ expectedVnd: 9_000_000, draftCount: 1, draftVnd: 700_000 })
  })

  it("6.3 + 6.5: xếp hạng mẫu, tỷ trọng màu; doanh số Sale, thợ, shipper đúng giờ", async () => {
    const products = new ProductRepository()
    const red = await products.create(a.ctx, { code: "SP-DO", name: "Bó hồng đỏ", attributes: { price: 100_000, mainColor: "Đỏ", style: "Hiện đại" } })
    const white = await products.create(a.ctx, { code: "SP-TRANG", name: "Giỏ lan trắng", attributes: { price: 900_000, mainColor: "Trắng" } })
    const o1 = await order(a, { status: "DELIVERED", total: 1_200_000, deliveredAt: at(9), shipperPhone: "0912345678" })
    await prisma.order_items.createMany({ data: [
      { organization_id: a.organizationId, order_id: o1.id, product_id: red.id, quantity: 3, unit_price_vnd: 100_000 },
      { organization_id: a.organizationId, order_id: o1.id, product_id: white.id, quantity: 1, unit_price_vnd: 900_000 },
    ] })
    await prisma.order_assignments.create({ data: { organization_id: a.organizationId, order_id: o1.id, assignee_id: a.userId, assigned_by: a.userId } })

    const prod = await getProductReport(can(a), Q)
    expect(prod.byQuantity[0]?.name).toBe("Bó hồng đỏ")
    expect(prod.byValue[0]?.name).toBe("Giỏ lan trắng")
    expect(prod.colors).toEqual([{ label: "Đỏ", quantity: 3, sharePercent: 75 }, { label: "Trắng", quantity: 1, sharePercent: 25 }])
    const perf = await getPerformanceReport(can(a), Q)
    expect(perf.sales[0]).toMatchObject({ userId: a.userId, orders: 1, revenueVnd: 1_200_000 })
    expect(perf.florists[0]).toMatchObject({ userId: a.userId, assigned: 1, done: 1 })
    expect(perf.shippers[0]).toMatchObject({ delivered: 1, onTime: 1, onTimeRate: 100 })
    expect((await getProductReport(can(b), Q)).byQuantity).toEqual([])
  })

  it("6.6: dòng tiền theo hình thức thu; giao dịch ngân hàng chưa khớp hiện đúng, không lẫn tổ chức khác", async () => {
    const o1 = await order(a, { status: "CONFIRMED", total: 500_000 })
    await prisma.order_payments.create({ data: { organization_id: a.organizationId, order_id: o1.id, kind: "DEPOSIT", amount_vnd: 500_000, payment_method: "BANK_TRANSFER", collected_by: a.userId, collected_at: at(8) } })
    await prisma.greeting_payment_events.createMany({ data: [
      { organization_id: a.organizationId, provider: "SEPAY", external_id: "t1", amount_vnd: 300_000, content: "CK BC", status: "MATCHED", transaction_at: at(8) },
      { organization_id: a.organizationId, provider: "SEPAY", external_id: "t2", amount_vnd: 90_000, content: "chuyen khoan la", status: "UNMATCHED", transaction_at: at(9) },
      { organization_id: b.organizationId, provider: "SEPAY", external_id: "t3", amount_vnd: 70_000, content: "cua B", status: "UNMATCHED", transaction_at: at(9) },
    ] })
    const cash = await getCashflowReport(can(a), Q)
    expect(cash.byMethod).toEqual([{ method: "BANK_TRANSFER", label: "Chuyển khoản / VietQR", collectedVnd: 500_000, refundedVnd: 0, netVnd: 500_000 }])
    expect(cash.daily.find((d) => d.date === DAY)).toMatchObject({ ledgerTransferVnd: 500_000, bankMatchedVnd: 300_000, unmatchedCount: 1, differenceVnd: 200_000 })
    expect(cash.unmatched.map((u) => u.amountVnd)).toEqual([90_000])
  })

  it("phạm vi chi nhánh; thiếu R20 → 403; kỳ sai → 400", async () => {
    const branch = await prisma.branches.create({ data: { organization_id: a.organizationId, name: "Chi nhánh 1", code: "CN1" } })
    await order(a, { status: "COMPLETED", total: 100_000, branchId: branch.id })
    await order(a, { status: "COMPLETED", total: 900_000 })
    expect((await getRevenueReport(can(a, { branchId: branch.id }), Q)).totals.expectedVnd).toBe(100_000)
    expect((await getRevenueReport(can(a), Q)).totals.expectedVnd).toBe(1_000_000)

    await expect(getOrderReport({ ...a.ctx, capabilities: new Set(["R1"]) }, Q)).rejects.toMatchObject({ code: "CAPABILITY_DENIED" })
    await expect(getOrderReport(can(a), { from: "2026-10-31", to: "2026-10-01" })).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    // Qua route: chủ tiệm (Điều hành) có R20 mặc định
    const res = await ordersRoute(withSession(`http://localhost/api/v1/reports/orders?from=${Q.from}&to=${Q.to}`, a.token))
    expect(res.status).toBe(200)
    expect(((await readJson(res)) as { data: { totals: { total: number } } }).data.totals.total).toBe(2)
    expect((await revenueRoute(withSession("http://localhost/api/v1/reports/revenue?from=2026-10-31&to=2026-10-01", a.token))).status).toBe(400)
  })
})
