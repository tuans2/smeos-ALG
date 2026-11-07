import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { AUTO_CANCEL_REASON } from "@/modules/greeting-card/domain/background-sweep"
import { UNPAID_EXPIRY_SETTINGS_KEY } from "@/modules/orders/domain/unpaid-order-expiry"
import { expireUnpaidOrders } from "@/modules/orders/use-cases/expire-unpaid-orders"
import { ingestOrder } from "@/modules/orders/use-cases/ingest-order"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * UJ-12 (audit hành trình 06/11/2026, O10 — UQ5): đơn catalog/landing chưa thanh toán quá hạn tự huỷ, CHỈ ở cửa
 * hàng đã bật; đơn nhập tay, đơn chờ báo giá, đơn còn hạn và cửa hàng chưa bật không bị đụng.
 */
describe("tự huỷ đơn chưa thanh toán ngoài Thẻ chào", () => {
  let on: Tenant
  let off: Tenant
  const now = new Date()
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000)

  // Tạo đơn trước, lùi `created_at` sau (lùi ngay thì bộ đếm "đơn hôm nay" đếm thiếu → trùng mã đơn)
  const backdate: Array<[string, Date]> = []
  async function order(t: Tenant, source: "CATALOG" | "LANDING" | "MANUAL", price: number, createdAt: Date): Promise<string> {
    const o = await ingestOrder(t.ctx, { source, items: [{ description: "Bó hoa", quantity: 1, unitPriceVnd: price }] })
    backdate.push([o.id, createdAt])
    return o.id
  }
  async function applyBackdate() {
    for (const [id, at] of backdate.splice(0)) await prisma.orders.update({ where: { id }, data: { created_at: at } })
  }
  const statusOf = async (id: string) => (await prisma.orders.findUniqueOrThrow({ where: { id } })).status

  beforeEach(async () => {
    await resetDatabase()
    on = await createTenant("bat")
    off = await createTenant("tat")
    await prisma.organizations.update({ where: { id: on.organizationId }, data: { settings: { [UNPAID_EXPIRY_SETTINGS_KEY]: { enabled: true, hours: 24 } } } })
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("chỉ huỷ đơn catalog/landing chưa thu, đã có giá, quá hạn, ở cửa hàng đã bật", async () => {
    const expiredCatalog = await order(on, "CATALOG", 500_000, hoursAgo(25))
    const expiredLanding = await order(on, "LANDING", 500_000, hoursAgo(30))
    const fresh = await order(on, "CATALOG", 500_000, hoursAgo(2))
    const needsQuote = await order(on, "CATALOG", 0, hoursAgo(48))
    const manual = await order(on, "MANUAL", 500_000, hoursAgo(48))
    const otherShop = await order(off, "CATALOG", 500_000, hoursAgo(48))
    await applyBackdate()

    expect(await expireUnpaidOrders(now)).toEqual({ cancelled: 2, failed: 0 })

    expect(await statusOf(expiredCatalog)).toBe("CANCELLED")
    expect(await statusOf(expiredLanding)).toBe("CANCELLED")
    for (const id of [fresh, needsQuote, manual, otherShop]) expect(await statusOf(id)).toBe("DRAFT")

    // Lý do trùng Thẻ chào → bộ quét lead cứu đơn nhận đơn này
    const ev = await prisma.order_events.findFirstOrThrow({ where: { order_id: expiredCatalog, to_value: "CANCELLED" } })
    expect(ev.reason).toBe(AUTO_CANCEL_REASON)
    expect(await expireUnpaidOrders(now)).toEqual({ cancelled: 0, failed: 0 })
  })

  it("đơn đã thu một phần không bị huỷ", async () => {
    const paid = await order(on, "CATALOG", 500_000, hoursAgo(48))
    await applyBackdate()
    await prisma.orders.update({ where: { id: paid }, data: { paid_vnd: 100_000, balance_vnd: 400_000 } })
    await expireUnpaidOrders(now)
    expect(await statusOf(paid)).toBe("DRAFT")
  })
})
