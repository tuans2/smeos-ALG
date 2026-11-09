import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { GET as listCustomers } from "@/app/api/v1/crm/customers/route"
import { GET as segmentCustomers } from "@/app/api/v1/customer-segments/[id]/customers/route"
import { POST as createSegment } from "@/app/api/v1/customer-segments/route"
import { POST as createLead } from "@/app/api/v1/leads/route"
import { POST as catalogLead } from "@/app/api/v1/public/catalog/[slug]/lead/route"
import { createCatalogLink } from "@/modules/catalog-links/use-cases/create-catalog-link"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Hồi quy P1 (audit API §27): khách tạo từ khách tiềm năng lưu địa chỉ `""`; bản mã của chuỗi rỗng có phần thân rỗng
 * từng bị `decryptPii` coi là hỏng → mọi lượt đọc danh sách khách của tổ chức trả 500. Gồm cả form công khai.
 */
const BASE = "http://localhost/api/v1"

describe("khách tạo từ khách tiềm năng không làm hỏng danh sách khách", () => {
  let t: Tenant
  const customers = async () => listCustomers(withSession(`${BASE}/crm/customers`, t.token))

  beforeAll(async () => {
    await resetDatabase()
    t = await createTenant("khach-dia-chi-rong")
    await createCatalogLink({ ...t.ctx, capabilities: new Set([...t.ctx.capabilities, "J1"]) }, { slug: "dia-chi-rong", name: "Bộ sưu tập", description: "Mô tả", filters: null })
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("nhân viên thêm khách tiềm năng → danh sách khách vẫn 200", async () => {
    const res = await createLead(withSession(`${BASE}/leads`, t.token, { method: "POST", body: JSON.stringify({ name: "Anh Minh", phone: "0912345678", reason: "WALK_IN" }) }))
    expect(res.status).toBe(201)
    const raw = await prisma.$queryRawUnsafe<{ address: string | null }[]>("select address from customers where organization_id = $1", t.organizationId)
    expect(raw[0]?.address?.startsWith("pii1.")).toBe(true) // vẫn là bản mã, không lưu chữ rõ
    const list = await customers()
    expect(list.status).toBe(200)
    expect(JSON.stringify(await readJson(list))).toContain("Anh Minh")
  })

  it("khách để lại thông tin qua catalog công khai → danh sách khách và khách trong nhóm vẫn 200", async () => {
    const lead = await catalogLead(
      new Request(`${BASE}/public/catalog/dia-chi-rong/lead`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Chị Hoa", phone: "0987654321", consent: true }) }),
      { params: Promise.resolve({ slug: "dia-chi-rong" }) }
    )
    expect(lead.status).toBe(201)
    expect((await customers()).status).toBe(200)
    const seg = await createSegment(withSession(`${BASE}/customer-segments`, t.token, { method: "POST", body: JSON.stringify({ name: "Khách mới", rules: { tiers: ["NEW"] } }) }))
    const id = String(((await readJson(seg)).data as { id: string }).id)
    const inSeg = await segmentCustomers(withSession(`${BASE}/customer-segments/${id}/customers`, t.token), { params: Promise.resolve({ id }) })
    expect(inSeg.status).toBe(200)
  })
})
