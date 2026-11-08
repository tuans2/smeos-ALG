import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as postCancel } from "@/app/api/v1/orders/[id]/cancel/route"
import { POST as postPayment } from "@/app/api/v1/orders/[id]/payments/route"
import { ingestOrder } from "@/modules/orders/use-cases/ingest-order"
import { OrderRepository } from "@/modules/orders/infra/order-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1"

/**
 * Audit BL-04 (06/11/2026): huỷ ở sổ đơn từng chỉ đổi `orders.status` — `order_coordinations.stage` giữ nguyên,
 * đơn đã huỷ vẫn nằm trên bảng Điều phối và vẫn bị đếm vào công suất đối tác; đơn đã giao vẫn huỷ được.
 */
describe("huỷ ở sổ đơn — đồng bộ Điều phối", () => {
  let a: Tenant
  let b: Tenant
  let orderId: string

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    orderId = (await ingestOrder(a.ctx, { source: "MANUAL", items: [{ description: "Kệ hoa", quantity: 1, unitPriceVnd: 1_000_000 }] })).id
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  const cancel = (t: Tenant, reason = "Khách đổi ý") =>
    postCancel(withSession(`${BASE}/orders/${orderId}/cancel`, t.token, { method: "POST", body: JSON.stringify({ reason }) }), { params: Promise.resolve({ id: orderId }) })

  it("đơn đã sang Điều phối → bước điều phối thành CANCELLED cùng lý do", async () => {
    const pay = await postPayment(
      withSession(`${BASE}/orders/${orderId}/payments`, a.token, { method: "POST", body: JSON.stringify({ amountVnd: 300_000, method: "CASH" }) }),
      { params: Promise.resolve({ id: orderId }) },
    )
    expect(pay.status).toBe(201)
    expect((await prisma.order_coordinations.findUniqueOrThrow({ where: { order_id: orderId } })).stage).toBe("INTAKE")

    expect((await cancel(b)).status).toBe(404)
    expect((await prisma.order_coordinations.findUniqueOrThrow({ where: { order_id: orderId } })).stage).toBe("INTAKE")

    expect((await cancel(a)).status).toBe(200)
    const coord = await prisma.order_coordinations.findUniqueOrThrow({ where: { order_id: orderId } })
    expect(coord).toMatchObject({ stage: "CANCELLED", cancelled_reason: "Khách đổi ý" })
    expect((await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("CANCELLED")
  })

  it("đơn chưa vào Điều phối vẫn huỷ ở sổ đơn như cũ", async () => {
    expect((await cancel(a)).status).toBe(200)
    expect((await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("CANCELLED")
    expect(await prisma.order_coordinations.count()).toBe(0)
  })

  it("đơn đã giao → 422, không đổi", async () => {
    await prisma.orders.update({ where: { id: orderId }, data: { status: "DELIVERED", delivery_status: "DELIVERED" } })
    expect((await cancel(a)).status).toBe(422)
    expect((await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("DELIVERED")
  })

})

/** Audit BL-18 (06/11/2026): sự kiện ghi trước, cập nhật đơn sau, không cùng giao dịch → lỗi giữa chừng để lại sự kiện mồ côi. */
describe("sự kiện trục và cập nhật đơn — một giao dịch", () => {
  it("cập nhật đơn lỗi → sự kiện đi kèm cũng không được ghi", async () => {
    await resetDatabase()
    const t = await createTenant("gamma")
    const id = (await ingestOrder(t.ctx, { source: "MANUAL", items: [{ description: "Bó hoa", quantity: 1, unitPriceVnd: 200_000 }] })).id
    const before = await prisma.order_events.count({ where: { order_id: id } })
    const repo = new OrderRepository()
    await expect(
      repo.update(t.organizationId, id, { status: "NOT_A_STATUS" as never }, [
        { axis: "order", fromValue: "DRAFT", toValue: "NOT_A_STATUS", actorId: t.userId, reason: "thử" },
      ]),
    ).rejects.toBeDefined()
    expect(await prisma.order_events.count({ where: { order_id: id } })).toBe(before)
  })
})
