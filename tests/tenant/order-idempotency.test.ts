import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as createOrder } from "@/app/api/v1/orders/route"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/** Audit API-11 (PO duyệt 07/11/2026): `POST /orders` gửi lại cùng `Idempotency-Key` không tạo đơn thứ hai. */

const BASE = "http://localhost/api/v1/orders"
const body = JSON.stringify({ items: [{ description: "Bó hồng", quantity: 1, unitPriceVnd: 500_000 }] })

function post(token: string, key?: string, payload: string = body) {
  return createOrder(withSession(BASE, token, { method: "POST", body: payload, headers: key ? { "Idempotency-Key": key } : {} }))
}
async function orderId(res: Response) {
  expect(res.status).toBe(201)
  return ((await readJson(res)).order as { id: string }).id
}
const count = (t: Tenant) => prisma.orders.count({ where: { organization_id: t.organizationId } })

describe("chống bấm đúp POST /orders", () => {
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

  it("gửi lại cùng khoá → cùng đơn, có Idempotent-Replayed, chỉ một đơn trong CSDL", async () => {
    const first = await post(a.token, "soan-don-1")
    expect(first.headers.get("idempotent-replayed")).toBeNull()
    const id = await orderId(first)
    const again = await post(a.token, "soan-don-1")
    expect(again.headers.get("idempotent-replayed")).toBe("true")
    expect(await orderId(again)).toBe(id)
    expect(await count(a)).toBe(1)
  })

  it("cùng khoá mà thân khác (PO 11/11/2026) → 422 IDEMPOTENCY_KEY_REUSED, không tạo đơn; thân giống (khoá xáo trộn) vẫn trả đơn cũ", async () => {
    const id = await orderId(await post(a.token, "soan-don-2"))
    const reordered = JSON.stringify({ items: [{ unitPriceVnd: 500_000, quantity: 1, description: "Bó hồng" }] })
    expect(await orderId(await post(a.token, "soan-don-2", reordered))).toBe(id)
    const changed = await post(a.token, "soan-don-2", JSON.stringify({ items: [{ description: "Bó cúc", quantity: 2, unitPriceVnd: 300_000 }] }))
    expect(changed.status).toBe(422)
    expect((await readJson(changed)).error).toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED", details: { order_id: id } })
    expect(await count(a)).toBe(1)
  })

  it("đơn cũ có khoá nhưng chưa có băm (trước migration) → gửi lại vẫn trả đơn cũ", async () => {
    const id = await orderId(await post(a.token, "don-cu"))
    await prisma.orders.update({ where: { id }, data: { idempotency_body_hash: null } })
    const other = JSON.stringify({ items: [{ description: "Bó cúc", quantity: 2, unitPriceVnd: 300_000 }] })
    expect(await orderId(await post(a.token, "don-cu", other))).toBe(id)
  })

  it("hai request cùng khoá gửi đồng thời → một đơn", async () => {
    const ids = await Promise.all([post(a.token, "dong-thoi"), post(a.token, "dong-thoi")].map(async (p) => orderId(await p)))
    expect(ids[0]).toBe(ids[1])
    expect(await count(a)).toBe(1)
  })

  it("khoá khác hoặc không có khoá → đơn mới như trước", async () => {
    await orderId(await post(a.token, "k-1"))
    await orderId(await post(a.token, "k-2"))
    await orderId(await post(a.token))
    await orderId(await post(a.token))
    expect(await count(a)).toBe(4)
  })

  it("cùng khoá ở tổ chức khác là đơn riêng, không lộ đơn của tổ chức kia", async () => {
    const idA = await orderId(await post(a.token, "chung"))
    const resB = await post(b.token, "chung")
    expect(resB.headers.get("idempotent-replayed")).toBeNull()
    expect(await orderId(resB)).not.toBe(idA)
    expect(await count(b)).toBe(1)
  })

  it("khoá quá 255 ký tự → 400, không tạo đơn", async () => {
    const res = await post(a.token, "x".repeat(256))
    expect(res.status).toBe(400)
    expect(await count(a)).toBe(0)
  })
})
