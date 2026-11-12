import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as listGreetingOrders } from "@/app/api/v1/greeting-card/orders/route"
import { GET as getOrder } from "@/app/api/v1/orders/[id]/route"
import { GET as listOrders, POST as createOrder } from "@/app/api/v1/orders/route"
import { GET as listProducts } from "@/app/api/v1/products/route"
import { saleBranchOfSession } from "@/modules/greeting-card/infra/sale-branch"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/** Checklist ALG 9.13 — nhân viên chỉ thấy đơn hàng, doanh số, tồn kho của chi nhánh được giao. */

const BASE = "http://localhost/api/v1"

describe("cách ly dữ liệu theo chi nhánh", () => {
  let a: Tenant
  let q1: string
  let q3: string
  let lan: { userId: string; token: string }
  let minh: { userId: string; token: string }

  async function branch(code: string) {
    return (await prisma.branches.create({ data: { organization_id: a.organizationId, name: `Chi nhánh ${code}`, code } })).id
  }
  async function assign(userId: string, branchId: string) {
    await prisma.memberships.updateMany({ where: { organization_id: a.organizationId, user_id: userId }, data: { branch_id: branchId } })
  }
  async function order(code: string, branchId: string | null, source = "MANUAL") {
    return (await prisma.orders.create({
      data: {
        id: randomUUID(), organization_id: a.organizationId, branch_id: branchId, code, source, status: "CONFIRMED",
        total_vnd: 500_000, paid_vnd: 0, balance_vnd: 500_000, created_by: a.userId,
      },
    })).id
  }

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    q1 = await branch("Q1")
    q3 = await branch("Q3")
    lan = await addStaffWithSession(a, "sale", "lan")
    minh = await addStaffWithSession(a, "sale", "minh")
    await assign(lan.userId, q1)
    await assign(minh.userId, q3)
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("đơn đa nguồn: nhân viên Q1 chỉ thấy đơn Q1, mở đơn Q3 → 404; Điều hành thấy tất cả", async () => {
    const own = await order("DH-Q1", q1)
    const other = await order("DH-Q3", q3)

    const codes = async (token: string) =>
      ((await readJson(await listOrders(withSession(`${BASE}/orders`, token)))).data as { code: string }[]).map((o) => o.code).sort()
    expect(await codes(lan.token)).toEqual(["DH-Q1"])
    expect(await codes(a.token)).toEqual(["DH-Q1", "DH-Q3"])

    const read = (token: string, id: string) => getOrder(withSession(`${BASE}/orders/${id}`, token), { params: Promise.resolve({ id }) })
    expect((await read(lan.token, own)).status).toBe(200)
    expect((await read(lan.token, other)).status).toBe(404)
    expect((await read(a.token, other)).status).toBe(200)
  })

  it("nhân viên Q1 tạo đơn → đơn thuộc Q1 dù gửi chi nhánh khác", async () => {
    const res = await createOrder(withSession(`${BASE}/orders`, lan.token, {
      method: "POST", body: JSON.stringify({ branch_id: q3, items: [{ description: "Bó hồng", quantity: 1, unitPriceVnd: 400_000 }] }),
    }))
    expect(res.status).toBe(201)
    const id = ((await readJson(res)).order as { id: string }).id
    expect((await prisma.orders.findUniqueOrThrow({ where: { id } })).branch_id).toBe(q1)
  })

  it("đơn Thẻ Chào: danh sách theo chi nhánh; đơn mang chi nhánh của Sale phụ trách link", async () => {
    await order("TC-Q1", q1, "BROCHURE")
    await order("TC-Q3", q3, "BROCHURE")
    const codes = async (token: string) =>
      ((await readJson(await listGreetingOrders(withSession(`${BASE}/greeting-card/orders`, token)))).data as { code: string }[]).map((o) => o.code).sort()
    expect(await codes(minh.token)).toEqual(["TC-Q3"])
    expect(await codes(a.token)).toEqual(["TC-Q1", "TC-Q3"])

    const catalog = await prisma.greeting_catalogs.create({ data: { organization_id: a.organizationId, code: "bst", name: "Bộ", created_by: a.userId } })
    const session = await prisma.greeting_sessions.create({
      data: { organization_id: a.organizationId, catalog_id: catalog.id, send_code: `s-${randomUUID().slice(0, 8)}`, sale_id: lan.userId } as never,
    })
    expect(await saleBranchOfSession(prisma, a.organizationId, session.id)).toBe(q1)
  })

  it("sản phẩm/tồn kho: nhân viên Q1 thấy sản phẩm dùng chung và của Q1, không thấy của Q3", async () => {
    for (const [code, branchId] of [["SP-CHUNG", null], ["SP-Q1", q1], ["SP-Q3", q3]] as const) {
      await prisma.products.create({ data: { organization_id: a.organizationId, branch_id: branchId, code, name: code, status: "ACTIVE" } })
    }
    const codes = async (token: string) =>
      ((await readJson(await listProducts(withSession(`${BASE}/products`, token)))).data as { code: string }[]).map((p) => p.code).sort()
    expect(await codes(lan.token)).toEqual(["SP-CHUNG", "SP-Q1"])
    expect(await codes(a.token)).toEqual(["SP-CHUNG", "SP-Q1", "SP-Q3"])
  })
})
