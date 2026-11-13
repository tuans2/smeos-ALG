import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as customerOrders } from "@/app/api/v1/crm/customers/[id]/orders/route"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/** Checklist ALG 4.11 — tab "Đơn đã đặt": đơn mọi nguồn của đúng khách, chỉ trong tổ chức mình. */

const BASE = "http://localhost/api/v1/crm/customers"

describe("đơn đã đặt của khách", () => {
  let a: Tenant
  let b: Tenant

  const order = (t: Tenant, code: string, extra: Record<string, unknown> = {}) =>
    prisma.orders.create({
      data: {
        id: randomUUID(), organization_id: t.organizationId, code, status: "CONFIRMED", created_by: t.userId,
        total_vnd: 500_000, paid_vnd: 0, balance_vnd: 500_000, ...extra,
      } as never,
    })
  const list = async (token: string, id: string) => {
    const res = await customerOrders(withSession(`${BASE}/${id}/orders`, token), { params: Promise.resolve({ id }) })
    return { status: res.status, codes: res.status === 200 ? ((await readJson(res)).data as { code: string }[]).map((o) => o.code).sort() : [] }
  }

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("gồm đơn gắn khách và đơn Thẻ Chào cùng SĐT người đặt; không lẫn khách khác; tổ chức khác → 404", async () => {
    const an = await prisma.customers.create({ data: { organization_id: a.organizationId, code: "KH-AN", name: "An", phone: "0987654321" } as never })
    const binh = await prisma.customers.create({ data: { organization_id: a.organizationId, code: "KH-BINH", name: "Bình", phone: "0911111111" } as never })
    await order(a, "DH-AN", { customer_id: an.id })
    await order(a, "DH-BINH", { customer_id: binh.id })
    const tc = await order(a, "TC-AN", { source: "BROCHURE" })
    const catalog = await prisma.greeting_catalogs.create({ data: { organization_id: a.organizationId, code: "bst", name: "Bộ", created_by: a.userId } })
    await prisma.greeting_sessions.create({
      data: { organization_id: a.organizationId, catalog_id: catalog.id, send_code: `s-${randomUUID().slice(0, 8)}`, customer_phone: "0987654321", sale_id: a.userId, order_id: tc.id } as never,
    })
    await order(b, "DH-B", {})

    expect(await list(a.token, an.id)).toEqual({ status: 200, codes: ["DH-AN", "TC-AN"] })
    expect((await list(b.token, an.id)).status).toBe(404)

    // Vai không xem được đơn (Thợ cắm) → 403
    const tho = await addStaffWithSession(a, "tho_cam", "tho")
    expect((await list(tho.token, an.id)).status).toBe(403)
  })
})
