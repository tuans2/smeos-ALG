import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { PATCH as patchOrder } from "@/app/api/v1/orders/[id]/route"
import { POST as postPayment } from "@/app/api/v1/orders/[id]/payments/route"
import { ingestOrder } from "@/modules/orders/use-cases/ingest-order"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1"

/**
 * Audit User Journey UJ-09 (O3, O4): đơn đã sang Điều phối chỉ đổi tiến độ ở Điều phối — nơi đòi bằng chứng (phân công,
 * QC, POD) và giữ bước điều phối khớp ba trục. Trước đây `PATCH /orders/:id` đổi trục chế tác/giao mà `stage` đứng yên.
 * Đơn đã kết thúc (hoàn tất / huỷ) chỉ còn sửa ghi chú nội bộ.
 */
describe("PATCH /orders/:id — tiến độ đơn đang ở Điều phối, đơn đã kết thúc", () => {
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

  const patch = (t: Tenant, body: Record<string, unknown>) =>
    patchOrder(withSession(`${BASE}/orders/${orderId}`, t.token, { method: "PATCH", body: JSON.stringify(body) }), { params: Promise.resolve({ id: orderId }) })
  const toCoordinator = async () => {
    const pay = await postPayment(
      withSession(`${BASE}/orders/${orderId}/payments`, a.token, { method: "POST", body: JSON.stringify({ amountVnd: 300_000, method: "CASH" }) }),
      { params: Promise.resolve({ id: orderId }) },
    )
    expect(pay.status).toBe(201)
    expect((await prisma.order_coordinations.findUniqueOrThrow({ where: { order_id: orderId } })).stage).toBe("INTAKE")
  }
  const axes = async () => {
    const o = await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })
    return { status: o.status, production: o.production_status, delivery: o.delivery_status }
  }

  it("đơn đã sang Điều phối: đổi trục chế tác / giao / trạng thái → 409, không ghi gì; bổ sung thông tin vẫn được", async () => {
    await toCoordinator()
    const before = await axes()
    const eventsBefore = await prisma.order_events.count({ where: { order_id: orderId } })

    for (const body of [{ production_status: "ASSIGNED" }, { delivery_status: "DISPATCHED" }, { status: "PROCESSING" }]) {
      const res = await patch(a, body)
      expect(res.status).toBe(409)
      expect(JSON.stringify(await readJson(res))).toMatch(/Điều phối/)
    }
    expect(await axes()).toEqual(before)
    expect(await prisma.order_events.count({ where: { order_id: orderId } })).toBe(eventsBefore)
    expect((await prisma.order_coordinations.findUniqueOrThrow({ where: { order_id: orderId } })).stage).toBe("INTAKE")

    const info = await patch(a, { card_message: "Chúc mừng sinh nhật" })
    expect(info.status).toBe(200)
    expect((await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })).card_message).toBe("Chúc mừng sinh nhật")
  })

  it("tổ chức khác → 404, không lộ là đơn đang ở Điều phối", async () => {
    await toCoordinator()
    expect((await patch(b, { production_status: "ASSIGNED" })).status).toBe(404)
  })

  it("đơn chưa sang Điều phối: đổi trục chế tác như cũ; ghi nhật ký kiểm toán không chép dữ liệu cá nhân", async () => {
    const res = await patch(a, { production_status: "ASSIGNED", card_message: "Chúc mừng sinh nhật" })
    expect(res.status).toBe(200)
    expect((await axes()).production).toBe("ASSIGNED")

    const logs = await prisma.audit_logs.findMany({ where: { organization_id: a.organizationId, action: "order.update", entity_id: orderId } })
    expect(logs).toHaveLength(1)
    expect(logs[0]?.after).toMatchObject({ productionStatus: "ASSIGNED", fields: ["productionStatus", "cardMessage"] })
    expect(JSON.stringify(logs[0])).not.toMatch(/Chúc mừng/)
  })

  it("đơn đã huỷ / đã hoàn tất: chỉ sửa ghi chú nội bộ; đổi địa chỉ, thiệp, trục → 409", async () => {
    for (const status of ["CANCELLED", "COMPLETED"] as const) {
      await prisma.orders.update({ where: { id: orderId }, data: { status } })
      const blocked = [
        { delivery_address: { recipientName: "Trần Thị Bình", phone: "0901 234 567", street: "12 Lê Lợi" } },
        { card_message: "Lời chúc mới" },
        { delivery_status: "DISPATCHED" },
      ]
      for (const body of blocked) expect((await patch(a, body)).status).toBe(409)
      const note = await patch(a, { internal_note: `Ghi chú sau khi ${status}` })
      expect(note.status).toBe(200)
      expect((await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })).internal_note).toBe(`Ghi chú sau khi ${status}`)
    }
  })
})
