import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as createOrder } from "@/app/api/v1/coordinator/orders/route"
import { GET as listPayments, POST as recordPayment } from "@/app/api/v1/coordinator/orders/[id]/payments/route"
import { POST as decidePayment } from "@/app/api/v1/coordinator/orders/[id]/payments/[paymentId]/decision/route"
import { POST as cancelOrder } from "@/app/api/v1/coordinator/orders/[id]/cancel/route"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/** Checklist ALG 1.16 (PO Q3 phương án b) — Sale/Điều phối ghi thu chờ Điều hành xác nhận mới vào sổ. */

const BASE = "http://localhost/api/v1/coordinator"
const ORDER_BODY = {
  customerName: "Nguyễn Văn An", customerPhone: "0987654321", customerTier: "VIP",
  recipientName: "Trần Thị Bình", recipientPhone: "0901234567",
  deliveryAddress: { street: "123 Phố Huế", ward: "Ngô Thì Nhậm", district: "Hai Bà Trưng", city: "Hà Nội" },
  deliveryTargetTime: "17:00 hôm nay", deliveryTargetAt: new Date(Date.now() + 6 * 3600_000).toISOString(),
  productTitle: "Bó hoa hồng Pastel", unitPriceVnd: 850000,
  flowers: [{ flowerName: "Hồng Ohara", quantity: 12, unit: "cành", color: "hồng", role: "Chủ đạo" }],
}

type PaymentRow = { id: string; status: string; amountVnd: number }

describe("ghi thu chờ Điều hành xác nhận", () => {
  let a: Tenant
  let b: Tenant
  let sale: { userId: string; token: string }
  let orderId: string

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    sale = await addStaffWithSession(a, "sale", "lan")
    const res = await createOrder(withSession(`${BASE}/orders`, a.token, { method: "POST", body: JSON.stringify(ORDER_BODY) }))
    expect(res.status).toBe(201)
    orderId = ((await readJson(res)).order as { id: string }).id
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  const record = (token: string, amountVnd: number) =>
    recordPayment(withSession(`${BASE}/orders/${orderId}/payments`, token, {
      method: "POST", body: JSON.stringify({ kind: "DEPOSIT", amountVnd, paymentMethod: "CASH" }),
    }), { params: Promise.resolve({ id: orderId }) })
  const decide = (token: string, paymentId: string, body: Record<string, unknown>) =>
    decidePayment(withSession(`${BASE}/orders/${orderId}/payments/${paymentId}/decision`, token, {
      method: "POST", body: JSON.stringify(body),
    }), { params: Promise.resolve({ id: orderId, paymentId }) })
  const payments = async (token: string) =>
    ((await readJson(await listPayments(withSession(`${BASE}/orders/${orderId}/payments`, token), { params: Promise.resolve({ id: orderId }) }))).payments as PaymentRow[])
  const paid = async () => Number((await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })).paid_vnd)

  it("Sale ghi cọc → chờ xác nhận, chưa cộng vào số đã thu; Điều hành xác nhận → vào sổ", async () => {
    expect((await record(sale.token, 300_000)).status).toBe(201)
    const [row] = await payments(a.token)
    expect(row).toMatchObject({ status: "PENDING", amountVnd: 300_000 })
    expect(await paid()).toBe(0)

    expect((await decide(sale.token, row!.id, { approve: true })).status).toBe(403)
    expect((await decide(b.token, row!.id, { approve: true })).status).toBe(404)

    expect((await decide(a.token, row!.id, { approve: true })).status).toBe(200)
    expect(await paid()).toBe(300_000)
    expect((await payments(a.token))[0]!.status).toBe("CONFIRMED")
    expect((await decide(a.token, row!.id, { approve: true })).status).toBe(404)
  })

  it("Điều hành từ chối (bắt buộc lý do) → khoản không vào sổ", async () => {
    await record(sale.token, 300_000)
    const [row] = await payments(a.token)
    expect((await decide(a.token, row!.id, { approve: false })).status).toBe(400)
    expect((await decide(a.token, row!.id, { approve: false, note: "Chưa nhận được tiền" })).status).toBe(200)
    expect((await payments(a.token))[0]!.status).toBe("REJECTED")
    expect(await paid()).toBe(0)
  })

  it("Điều hành tự ghi thu thì có hiệu lực ngay", async () => {
    expect((await record(a.token, 300_000)).status).toBe(201)
    expect((await payments(a.token))[0]!.status).toBe("CONFIRMED")
    expect(await paid()).toBe(300_000)
  })

  it("audit BL-21: huỷ đơn → khoản đang chờ thành Đã từ chối, không duyệt vào đơn đã huỷ được", async () => {
    await record(sale.token, 300_000)
    const [row] = await payments(a.token)
    const cancel = await cancelOrder(withSession(`${BASE}/orders/${orderId}/cancel`, a.token, {
      method: "POST", body: JSON.stringify({ reason: "Khách đổi ý" }),
    }), { params: Promise.resolve({ id: orderId }) })
    expect(cancel.status).toBe(200)
    expect((await payments(a.token))[0]!.status).toBe("REJECTED")
    expect((await decide(a.token, row!.id, { approve: true })).status).toBe(404)
    expect(await paid()).toBe(0)
  })

  it("audit BL-21: khoản chờ còn sót trên đơn đã huỷ (dữ liệu cũ) → duyệt bị chặn 422", async () => {
    await record(sale.token, 300_000)
    const [row] = await payments(a.token)
    await prisma.orders.update({ where: { id: orderId }, data: { status: "CANCELLED" } })
    expect((await decide(a.token, row!.id, { approve: true })).status).toBe(422)
    expect((await payments(a.token))[0]!.status).toBe("PENDING")
    expect(await paid()).toBe(0)
  })

  it("audit BL-21: các khoản chờ cộng lại không vượt phần còn phải thu (đơn 850.000 đ)", async () => {
    expect((await record(sale.token, 500_000)).status).toBe(201)
    expect((await record(sale.token, 400_000)).status).toBe(422)
    expect((await record(sale.token, 350_000)).status).toBe(201)
    expect((await payments(a.token)).map((p) => p.status)).toEqual(["PENDING", "PENDING"])
  })
})
