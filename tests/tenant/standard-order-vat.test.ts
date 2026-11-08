import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET, PUT } from "@/app/api/v1/orders/[id]/vat/route"
import { ingestOrder } from "@/modules/orders/use-cases/ingest-order"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1"

/** PO 07/11/2026 (kế hoạch logic nghiệp vụ Q10): đơn ngoài Thẻ chào tính VAT khi khách cần hoá đơn. */
describe("VAT đơn chuẩn", () => {
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

  const params = (id: string) => ({ params: Promise.resolve({ id }) })
  const put = (t: Tenant, id: string, body: Record<string, unknown>) =>
    PUT(withSession(`${BASE}/orders/${id}/vat`, t.token, { method: "PUT", body: JSON.stringify(body) }), params(id))

  it("bật VAT 10% → tổng và còn phải thu tính lại, lưu thông tin hoá đơn; tắt → về giá trước thuế", async () => {
    const res = await put(a, orderId, { enabled: true, rate: 10, company_name: "Công ty An Bình", tax_code: "0312345678" })
    expect(res.status).toBe(200)
    expect(((await readJson(res)).data as { totalVnd: number }).totalVnd).toBe(1_100_000)
    const row = await prisma.orders.findUniqueOrThrow({ where: { id: orderId }, include: { recipient: true } })
    expect(Number(row.total_vnd)).toBe(1_100_000)
    expect(Number(row.balance_vnd)).toBe(1_100_000)
    expect(row.recipient?.vat_tax_code).toBe("0312345678")
    const got = (await readJson(await GET(withSession(`${BASE}/orders/${orderId}/vat`, a.token), params(orderId)))).data as { vatAmountVnd: number }
    expect(got.vatAmountVnd).toBe(100_000)

    expect((await put(a, orderId, { enabled: false })).status).toBe(200)
    expect(Number((await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })).total_vnd)).toBe(1_000_000)
  })

  it("tổ chức khác → 404, đơn không đổi", async () => {
    expect((await put(b, orderId, { enabled: true, rate: 10 })).status).toBe(404)
    expect(Number((await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })).total_vnd)).toBe(1_000_000)
  })

  it("đơn Thẻ chào không đi đường này (404)", async () => {
    await prisma.orders.update({ where: { id: orderId }, data: { source: "BROCHURE" } })
    expect((await put(a, orderId, { enabled: true, rate: 10 })).status).toBe(404)
  })
})
