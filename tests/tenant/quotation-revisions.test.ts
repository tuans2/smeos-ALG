import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as listRevisions } from "@/app/api/v1/quotations/[id]/revisions/route"
import { PATCH as patchQuotation } from "@/app/api/v1/quotations/[id]/route"
import { POST as createQuotation } from "@/app/api/v1/quotations/route"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/** Checklist ALG 3.8 (phiên bản kích cỡ, phí vận chuyển) và 3.10 (lịch sử phiên bản báo giá). */

const BASE = "http://localhost/api/v1/quotations"
type Q = { id: string; subtotal: number; discountAmount: number; shippingFee: number; totalAmount: number; items: { name: string; variantLabel: string | null }[] }
type Rev = { version: number; snapshot: { totalAmount: number; items: { qty: number }[] } }
const params = (id: string) => ({ params: Promise.resolve({ id }) })

describe("báo giá: phiên bản, phí vận chuyển, lịch sử sửa", () => {
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

  async function create() {
    const res = await createQuotation(withSession(BASE, a.token, {
      method: "POST",
      body: JSON.stringify({ items: [{ name: "Bó hồng", variantLabel: "Lớn", qty: 1, unitPrice: 900_000 }], discount_amount: 100_000, shipping_fee: 30_000 }),
    }))
    expect(res.status).toBe(201)
    return (await readJson(res)).data as Q
  }
  const patch = (token: string, id: string, body: Record<string, unknown>) =>
    patchQuotation(withSession(`${BASE}/${id}`, token, { method: "PATCH", body: JSON.stringify(body) }), params(id))
  const revisions = async (token: string, id: string) => {
    const res = await listRevisions(withSession(`${BASE}/${id}/revisions`, token), params(id))
    return { status: res.status, rows: res.status === 200 ? ((await readJson(res)).data as Rev[]) : [] }
  }

  it("tổng = tạm tính − ưu đãi + phí vận chuyển; dòng giữ phiên bản kích cỡ", async () => {
    const q = await create()
    expect(q).toMatchObject({ subtotal: 900_000, discountAmount: 100_000, shippingFee: 30_000, totalAmount: 830_000 })
    expect(q.items[0]!.variantLabel).toBe("Lớn")
  })

  it("sửa 2 lần → 2 phiên bản trước đọc lại đúng; đổi trạng thái không tạo phiên bản; tổ chức khác → 404", async () => {
    const q = await create()
    expect((await patch(a.token, q.id, { items: [{ name: "Bó hồng", variantLabel: "Lớn", qty: 2, unitPrice: 900_000 }] })).status).toBe(200)
    expect((await patch(a.token, q.id, { shipping_fee: 50_000 })).status).toBe(200)
    expect((await patch(a.token, q.id, { status: "SENT" })).status).toBe(200)

    const { rows } = await revisions(a.token, q.id)
    expect(rows.map((r) => r.version)).toEqual([2, 1])
    expect(rows[1]!.snapshot.totalAmount).toBe(830_000)
    expect(rows[1]!.snapshot.items[0]!.qty).toBe(1)
    expect(rows[0]!.snapshot.totalAmount).toBe(1_730_000)

    expect((await revisions(b.token, q.id)).status).toBe(404)
    expect(await prisma.quotation_revisions.count({ where: { organization_id: b.organizationId } })).toBe(0)
    expect(await prisma.quotation_revisions.count({ where: { organization_id: a.organizationId, quotation_id: q.id } })).toBe(2)
    expect((await patch(b.token, q.id, { shipping_fee: 0 })).status).toBe(404)
  })
})
