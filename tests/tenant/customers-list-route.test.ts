import { afterAll, beforeAll, describe, expect, it } from "vitest"

import * as R from "@/app/api/v1/_contracts/responses-marketing"
import { POST as createCustomer } from "@/app/api/v1/crm/customers/route"
import { GET as listCustomers } from "@/app/api/v1/customers/route"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * `GET /api/v1/customers` (audit L-04, 12/11/2026): màn Chăm sóc khách, nhóm "Tất cả" gọi route này nhưng route chưa từng
 * có nên danh sách luôn rỗng. Cách ly tổ chức, quyền `M4` hoặc `Q1`, phân trang con trỏ — CSDL thật.
 */
const BASE = "http://localhost/api/v1"

describe("GET /api/v1/customers", () => {
  let a: Tenant
  let b: Tenant

  const add = (t: Tenant, name: string, phone: string) =>
    createCustomer(withSession(`${BASE}/crm/customers`, t.token, { method: "POST", body: JSON.stringify({ name, phone }) }))
  const list = (token: string, query = "") => listCustomers(withSession(`${BASE}/customers${query}`, token))

  beforeAll(async () => {
    await resetDatabase()
    a = await createTenant("khach-tat-ca-a")
    b = await createTenant("khach-tat-ca-b")
    for (const [name, phone] of [["Khách A1", "0912000001"], ["Khách A2", "0912000002"], ["Khách A3", "0912000003"]] as const) {
      expect((await add(a, name, phone)).status).toBe(201)
    }
    expect((await add(b, "Khách B1", "0912000009")).status).toBe(201)
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("chỉ trả khách của tổ chức mình, phân trang con trỏ đủ và không trùng", async () => {
    const first = await expectContract(await list(a.token, "?limit=2"), 200, R.customersPageResponse, "customers-page")
    const page1 = first.data as { id: string; name: string }[]
    expect(page1).toHaveLength(2)
    expect(typeof first.next_cursor).toBe("string")

    const second = await expectContract(
      await list(a.token, `?limit=2&cursor=${encodeURIComponent(first.next_cursor as string)}`),
      200,
      R.customersPageResponse,
      "customers-page"
    )
    const page2 = second.data as { id: string; name: string }[]
    expect(page2).toHaveLength(1)
    expect(second.next_cursor).toBeNull()

    const names = [...page1, ...page2].map((c) => c.name).sort()
    expect(names).toEqual(["Khách A1", "Khách A2", "Khách A3"])

    const other = await readJson(await list(b.token))
    expect((other.data as { name: string }[]).map((c) => c.name)).toEqual(["Khách B1"])
  })

  it("tìm theo tên trong phạm vi tổ chức", async () => {
    const found = await readJson(await list(a.token, `?search=${encodeURIComponent("A2")}`))
    expect((found.data as { name: string }[]).map((c) => c.name)).toEqual(["Khách A2"])
    const none = await readJson(await list(b.token, `?search=${encodeURIComponent("A2")}`))
    expect(none.data).toEqual([])
  })

  it("quyền: M4 (Marketing) hoặc Q1 (Sale) được xem; không có mã nào → 403", async () => {
    const marketing = await addStaffWithSession(a, "marketing", "marketing")
    const sale = await addStaffWithSession(a, "sale", "sale")
    const shipper = await addStaffWithSession(a, "shipper", "shipper")
    expect((await list(marketing.token)).status).toBe(200)
    expect((await list(sale.token)).status).toBe(200)
    expect((await list(shipper.token)).status).toBe(403)
  })

  it("con trỏ hỏng hoặc limit ngoài 1–100 → 400", async () => {
    expect((await list(a.token, "?cursor=khong-hop-le")).status).toBe(400)
    expect((await list(a.token, `?cursor=${Buffer.from(JSON.stringify({ id: "x" })).toString("base64url")}`)).status).toBe(400)
    expect((await list(a.token, "?limit=101")).status).toBe(400)
  })
})
