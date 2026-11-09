import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as listGreetingOrders } from "@/app/api/v1/greeting-card/orders/route"
import { GET as listOrders } from "@/app/api/v1/orders/route"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/** Checklist ALG 4.3 — lọc danh sách đơn theo khoảng ngày giao, nhân viên bán, chi nhánh. */

const BASE = "http://localhost/api/v1"

describe("lọc nâng cao danh sách đơn", () => {
  let a: Tenant
  let b: Tenant
  let lan: { userId: string; token: string }
  let q1: string

  async function order(code: string, opts: { source?: string; date?: string; sale?: string; branchId?: string | null; target?: Date }) {
    const id = randomUUID()
    await prisma.orders.create({
      data: {
        id, organization_id: a.organizationId, code, source: opts.source ?? "MANUAL", status: "CONFIRMED", created_by: a.userId,
        owner_sale_id: opts.sale ?? null, branch_id: opts.branchId ?? null, total_vnd: 500_000, paid_vnd: 0, balance_vnd: 500_000,
        ...(opts.date ? { delivery_window: { date: opts.date } } : {}),
        ...(opts.target ? { coordination: { create: { estimated_delivery_at: opts.target } } } : {}),
      },
    })
    return id
  }
  const codes = async (path: string, token = a.token) => {
    const body = await readJson(await listOrders(withSession(`${BASE}/orders${path}`, token)))
    return (body.data as { code: string }[]).map((o) => o.code).sort()
  }

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    lan = await addStaffWithSession(a, "sale", "lan")
    q1 = (await prisma.branches.create({ data: { organization_id: a.organizationId, name: "Q1", code: "Q1" } })).id
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("đơn đa nguồn: lọc theo ngày giao (cả giờ hẹn của đơn Điều phối) và theo nhân viên bán", async () => {
    await order("DH-0510", { date: "2026-11-05", sale: lan.userId })
    await order("DH-0610", { date: "2026-11-06" })
    await order("DP-0510", { target: new Date("2026-11-05T09:00:00+07:00") })
    await order("DH-KHONG-NGAY", {})

    expect(await codes("?delivery_from=2026-11-05&delivery_to=2026-11-05")).toEqual(["DH-0510", "DP-0510"])
    expect(await codes("?delivery_from=2026-11-06")).toEqual(["DH-0610"])
    expect(await codes(`?sale_id=${lan.userId}`)).toEqual(["DH-0510"])
    expect(await codes("?delivery_from=khong-hop-le")).toHaveLength(4)
    expect(await codes("?delivery_from=2026-11-05", b.token)).toEqual([])
  })

  it("đơn Thẻ Chào: lọc theo ngày giao, chi nhánh và Sale gửi link", async () => {
    await order("TC-Q1", { source: "BROCHURE", date: "2026-11-05", branchId: q1 })
    const other = await order("TC-KHAC", { source: "BROCHURE", date: "2026-11-07" })
    const catalog = await prisma.greeting_catalogs.create({ data: { organization_id: a.organizationId, code: "bst", name: "Bộ", created_by: a.userId } })
    await prisma.greeting_sessions.create({
      data: { organization_id: a.organizationId, catalog_id: catalog.id, send_code: `s-${randomUUID().slice(0, 8)}`, sale_id: lan.userId, order_id: other } as never,
    })
    const tc = async (path: string, token = a.token) =>
      ((await readJson(await listGreetingOrders(withSession(`${BASE}/greeting-card/orders${path}`, token)))).data as { code: string }[]).map((o) => o.code).sort()

    expect(await tc("?delivery_from=2026-11-05&delivery_to=2026-11-06")).toEqual(["TC-Q1"])
    expect(await tc(`?branch_id=${q1}`)).toEqual(["TC-Q1"])
    expect(await tc(`?sale_id=${lan.userId}`)).toEqual(["TC-KHAC"])
    expect(await tc("", b.token)).toEqual([])
  })
})
