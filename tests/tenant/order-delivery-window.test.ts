import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { PATCH as changeWindow } from "@/app/api/v1/orders/[id]/delivery-window/route"
import { PATCH as patchOrder } from "@/app/api/v1/orders/[id]/route"
import { ingestOrder } from "@/modules/orders/use-cases/ingest-order"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, withSession, type Tenant } from "../helpers/fixtures"

/** Sale đổi giờ giao đơn mình tạo, kèm lý do; lịch sử giữ giá trị cũ/mới (checklist ALG 4.6, GD1 Bước 6 E-14, PO 11/11/2026). */
describe("PATCH /orders/:id/delivery-window", () => {
  let a: Tenant
  let b: Tenant
  let sale: { userId: string; token: string }

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    sale = await addStaffWithSession(a, "sale", "lan")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  const params = (id: string) => ({ params: Promise.resolve({ id }) })
  const change = (token: string, id: string, body: unknown) =>
    changeWindow(withSession(`http://localhost/api/v1/orders/${id}/delivery-window`, token, { method: "PATCH", body: JSON.stringify(body) }), params(id))
  const orderBy = async (userId: string, t: Tenant = a) =>
    (await ingestOrder({ ...t.ctx, userId }, { source: "MANUAL", items: [{ description: "Bó hồng", quantity: 1, unitPriceVnd: 500000 }], deliveryWindow: { date: "2026-12-01", timeSlot: "14:00 - 16:00" } })).id
  const windowEvents = (orderId: string) => prisma.order_events.findMany({ where: { order_id: orderId, axis: "delivery_window" } })

  it("Sale đổi giờ giao đơn mình tạo: lịch sử có giá trị cũ, mới, người đổi, lý do", async () => {
    const id = await orderBy(sale.userId)
    expect((await change(sale.token, id, { date: "2026-12-01", time_slot: "16:00 - 18:00", reason: "Khách bận họp" })).status).toBe(200)
    const order = await prisma.orders.findUniqueOrThrow({ where: { id } })
    expect(order.delivery_window).toMatchObject({ date: "2026-12-01", timeSlot: "16:00 - 18:00" })
    expect(await windowEvents(id)).toMatchObject([{ from_value: "2026-12-01 14:00 - 16:00", to_value: "2026-12-01 16:00 - 18:00", actor_id: sale.userId, reason: "Khách bận họp" }])
    expect(await prisma.audit_logs.count({ where: { organization_id: a.organizationId, action: "order.delivery_window.update", entity_id: id } })).toBe(1)
  })

  it("thiếu lý do → 400; đơn người khác tạo → 404; đơn tổ chức khác → 404", async () => {
    const own = await orderBy(sale.userId)
    expect((await change(sale.token, own, { date: "2026-12-02", reason: "" })).status).toBe(400)
    const others = await orderBy(a.userId)
    expect((await change(sale.token, others, { date: "2026-12-02", reason: "Khách hẹn lại" })).status).toBe(404)
    const foreign = await orderBy(b.userId, b)
    expect((await change(a.token, foreign, { date: "2026-12-02", reason: "Khách hẹn lại" })).status).toBe(404)
    expect(await windowEvents(others)).toEqual([])
  })

  it("Điều hành đổi giờ ở sửa đơn (R3) cũng ghi lịch sử", async () => {
    const id = await orderBy(sale.userId)
    const res = await patchOrder(withSession(`http://localhost/api/v1/orders/${id}`, a.token, { method: "PATCH", body: JSON.stringify({ deliveryWindow: { date: "2026-12-03", timeSlot: "08:00 - 10:00" } }) }), params(id))
    expect(res.status).toBe(200)
    expect(await windowEvents(id)).toMatchObject([{ from_value: "2026-12-01 14:00 - 16:00", to_value: "2026-12-03 08:00 - 10:00", actor_id: a.userId }])
  })
})
