import { randomUUID } from "node:crypto"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { GET as listOrders } from "@/app/api/v1/orders/route"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Audit API-10 (PO 09/11/2026): `GET /orders` phân trang con trỏ `{ data, next_cursor, meta: { total } }` — trước đây
 * chỉ có trang đầu `{ orders, total }`. Thứ tự `created_at` giảm dần rồi `id` giảm dần: đơn trùng thời điểm không bị
 * lặp hay sót giữa hai trang. Con trỏ không vượt ranh giới tổ chức.
 */
const BASE = "http://localhost/api/v1"
type Page = { data: { id: string; code: string }[]; next_cursor: string | null; meta: { total: number } }

describe("GET /orders — phân trang con trỏ", () => {
  let a: Tenant
  let b: Tenant
  const page = async (t: Tenant, query: string) => (await readJson(await listOrders(withSession(`${BASE}/orders${query}`, t.token)))) as unknown as Page

  beforeAll(async () => {
    await resetDatabase()
    a = await createTenant("trang-a")
    b = await createTenant("trang-b")
    const sameInstant = new Date("2026-11-01T08:00:00.000Z")
    // 5 đơn: 3 đơn TRÙNG created_at (kiểm thứ tự phụ theo id), 2 đơn khác thời điểm
    const at = [sameInstant, sameInstant, sameInstant, new Date("2026-11-02T08:00:00.000Z"), new Date("2026-10-30T08:00:00.000Z")]
    for (const [i, created] of at.entries()) {
      await prisma.orders.create({ data: { id: randomUUID(), organization_id: a.organizationId, code: `DH-TRANG-${i}`, status: "CONFIRMED", created_by: a.userId, total_vnd: 1000, paid_vnd: 0, balance_vnd: 1000, created_at: created } })
    }
    await prisma.orders.create({ data: { id: randomUUID(), organization_id: b.organizationId, code: "DH-KHAC", status: "CONFIRMED", created_by: b.userId, total_vnd: 1000, paid_vnd: 0, balance_vnd: 1000 } })
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("đi hết các trang: không lặp, không sót, đúng thứ tự; total không đổi theo trang", async () => {
    const seen: string[] = []
    let cursor: string | null = null
    let pages = 0
    do {
      const p: Page = await page(a, `?limit=2${cursor ? `&cursor=${cursor}` : ""}`)
      expect(p.meta.total).toBe(5)
      expect(p.data.length).toBeLessThanOrEqual(2)
      seen.push(...p.data.map((o) => o.code))
      cursor = p.next_cursor
      pages++
    } while (cursor && pages < 10)
    expect(pages).toBe(3)
    expect(new Set(seen).size).toBe(5)
    expect(seen[0]).toBe("DH-TRANG-3") // mới nhất trước
    expect(seen[4]).toBe("DH-TRANG-4") // cũ nhất sau
  })

  it("trang cuối next_cursor = null; con trỏ của tổ chức A dùng ở tổ chức B không lộ đơn của A", async () => {
    const first = await page(a, "?limit=4")
    expect(first.next_cursor).not.toBeNull()
    expect((await page(a, `?limit=4&cursor=${first.next_cursor}`)).next_cursor).toBeNull()
    const cross = await page(b, `?cursor=${first.next_cursor}`)
    expect(cross.data.map((o) => o.code).every((c) => c === "DH-KHAC")).toBe(true)
    expect(cross.meta.total).toBe(1)
  })
})
