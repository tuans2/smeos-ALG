import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as listOrders, POST as createOrder } from "@/app/api/v1/orders/route"
import { GET as getOrderById, PATCH as patchOrder } from "@/app/api/v1/orders/[id]/route"
import { POST as cancelOrder } from "@/app/api/v1/orders/[id]/cancel/route"
import { GET as getOrderEvents } from "@/app/api/v1/orders/[id]/events/route"
import { GET as getOrderPrint } from "@/app/api/v1/orders/[id]/print/route"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"
import type { OrderRecord } from "@/modules/orders/domain/order-types"

type OrderListBody = {
  meta: { total: number }
  data: OrderRecord[]
}

const BASE = "http://localhost/api/v1"

describe("cách ly tenant — đơn hàng và vận hành M10 (P22)", () => {
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

  it("POST /orders rồi GET /orders/:id chỉ đọc lại được bằng chính tổ chức đã tạo (404 cho bên khác)", async () => {
    const resCreate = await createOrder(
      withSession(`${BASE}/orders`, a.token, {
        method: "POST",
        body: JSON.stringify({
          items: [
            {
              description: "Bó hoa hồng đỏ 20 cành",
              quantity: 1,
              unitPriceVnd: 550000,
            },
          ],
          cardMessage: "Chúc mừng sinh nhật em yêu!",
        }),
      })
    )
    expect(resCreate.status).toBe(201)
    const { order } = (await readJson(resCreate)) as { order: OrderRecord }
    const id = order.id as string

    // Tổ chức A đọc lại được
    const ownRead = await getOrderById(withSession(`${BASE}/orders/${id}`, a.token), {
      params: Promise.resolve({ id }),
    })
    expect(ownRead.status).toBe(200)
    const ownData = (await readJson(ownRead)) as { order: OrderRecord; sla?: unknown }
    expect(ownData.order.cardMessage).toBe("Chúc mừng sinh nhật em yêu!")
    expect(ownData.sla).toBeDefined()

    // Tổ chức B đọc -> 404 (Không thấy đơn)
    const otherRead = await getOrderById(withSession(`${BASE}/orders/${id}`, b.token), {
      params: Promise.resolve({ id }),
    })
    expect(otherRead.status).toBe(404)
  })

  it("PATCH /orders/:id từ tổ chức khác trả về 404, không sửa được trạng thái đơn", async () => {
    const resCreate = await createOrder(
      withSession(`${BASE}/orders`, a.token, {
        method: "POST",
        body: JSON.stringify({
          items: [{ description: "Giỏ hoa khai trương", quantity: 1, unitPriceVnd: 850000 }],
        }),
      })
    )
    const { order } = (await readJson(resCreate)) as { order: OrderRecord }
    const id = order.id as string

    // Tổ chức B cố cập nhật -> 404
    const resPatch = await patchOrder(
      withSession(`${BASE}/orders/${id}`, b.token, {
        method: "PATCH",
        body: JSON.stringify({ status: "CONFIRMED" }),
      }),
      { params: Promise.resolve({ id }) }
    )
    expect(resPatch.status).toBe(404)

    // Kiểm tra lại trên A trạng thái vẫn là DRAFT
    const checkA = await getOrderById(withSession(`${BASE}/orders/${id}`, a.token), {
      params: Promise.resolve({ id }),
    })
    const dataA = (await readJson(checkA)) as { order: OrderRecord }
    expect(dataA.order.status).toBe("DRAFT")
  })

  it("POST /orders/:id/cancel từ tổ chức khác trả về 404, từ tổ chức A hủy thành công", async () => {
    const resCreate = await createOrder(
      withSession(`${BASE}/orders`, a.token, {
        method: "POST",
        body: JSON.stringify({
          items: [{ description: "Bình hoa cẩm tú cầu", quantity: 1, unitPriceVnd: 450000 }],
        }),
      })
    )
    const { order } = (await readJson(resCreate)) as { order: OrderRecord }
    const id = order.id as string

    // B cố hủy -> 404
    const resCancelB = await cancelOrder(
      withSession(`${BASE}/orders/${id}/cancel`, b.token, {
        method: "POST",
        body: JSON.stringify({ reason: "B muốn hủy" }),
      }),
      { params: Promise.resolve({ id }) }
    )
    expect(resCancelB.status).toBe(404)

    // A hủy hợp lệ
    const resCancelA = await cancelOrder(
      withSession(`${BASE}/orders/${id}/cancel`, a.token, {
        method: "POST",
        body: JSON.stringify({ reason: "Khách đổi ý muốn đặt mẫu khác" }),
      }),
      { params: Promise.resolve({ id }) }
    )
    expect(resCancelA.status).toBe(200)
    const dataCancel = (await readJson(resCancelA)) as { order: OrderRecord }
    expect(dataCancel.order.status).toBe("CANCELLED")
  })

  it("GET /orders chỉ trả về danh sách đơn của tổ chức mình", async () => {
    await createOrder(
      withSession(`${BASE}/orders`, a.token, {
        method: "POST",
        body: JSON.stringify({
          items: [{ description: "Đơn Org A", quantity: 1, unitPriceVnd: 100000 }],
        }),
      })
    )

    await createOrder(
      withSession(`${BASE}/orders`, b.token, {
        method: "POST",
        body: JSON.stringify({
          items: [{ description: "Đơn Org B", quantity: 1, unitPriceVnd: 200000 }],
        }),
      })
    )

    const listA = (await readJson(await listOrders(withSession(`${BASE}/orders`, a.token)))) as OrderListBody
    expect(listA.meta.total).toBe(1)
    expect(listA.data[0]?.items?.[0]?.description).toBe("Đơn Org A")

    const listB = (await readJson(await listOrders(withSession(`${BASE}/orders`, b.token)))) as OrderListBody
    expect(listB.meta.total).toBe(1)
    expect(listB.data[0]?.items?.[0]?.description).toBe("Đơn Org B")
  })

  it("GET /orders/:id/events và /print không thể đọc chéo giữa hai tổ chức", async () => {
    const resCreate = await createOrder(
      withSession(`${BASE}/orders`, a.token, {
        method: "POST",
        body: JSON.stringify({
          items: [{ description: "Đơn in phiếu", quantity: 1, unitPriceVnd: 300000 }],
          cardMessage: "Chúc bạn luôn vui vẻ",
        }),
      })
    )
    const { order } = (await readJson(resCreate)) as { order: OrderRecord }
    const id = order.id as string

    // Events
    const eventsA = await getOrderEvents(withSession(`${BASE}/orders/${id}/events`, a.token), {
      params: Promise.resolve({ id }),
    })
    expect(eventsA.status).toBe(200)

    const eventsB = await getOrderEvents(withSession(`${BASE}/orders/${id}/events`, b.token), {
      params: Promise.resolve({ id }),
    })
    expect(eventsB.status).toBe(404)

    // Print
    const printA = await getOrderPrint(withSession(`${BASE}/orders/${id}/print`, a.token), {
      params: Promise.resolve({ id }),
    })
    expect(printA.status).toBe(200)

    const printB = await getOrderPrint(withSession(`${BASE}/orders/${id}/print`, b.token), {
      params: Promise.resolve({ id }),
    })
    expect(printB.status).toBe(404)
  })
})
