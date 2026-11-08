import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as listAccess } from "@/app/api/v1/audit-logs/platform-access/route"
import { GET as getCredits } from "@/app/api/v1/platform/organizations/[id]/credits/route"
import { GET as getOrganization } from "@/app/api/v1/platform/organizations/[id]/route"
import { PlatformOperatorRepository } from "@/modules/platform/infra/platform-operator-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1/platform/organizations"
const params = (id: string) => ({ params: Promise.resolve({ id }) })

type AccessList = { data: Array<{ purpose: string; purpose_label: string; operator_name: string | null }>; next_cursor: string | null }

/** ADR-013 D-I5, D-60: Console truy cập dữ liệu một tổ chức → một dòng; chủ tổ chức (G9) thấy, tổ chức khác không. */
describe("nhật ký truy cập của nhân viên nền tảng", () => {
  let a: Tenant
  let b: Tenant
  let op: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("truy-cap-a")
    b = await createTenant("truy-cap-b")
    op = await createTenant("truy-cap-op")
    await new PlatformOperatorRepository().grant(op.userId, ["N1"], null)
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  const list = async (t: Tenant, token = t.token) => listAccess(withSession("http://localhost/api/v1/audit-logs/platform-access", token))

  it("mỗi lần Console mở dữ liệu tổ chức A ghi một dòng cho A (mục đích suy từ thao tác), B không có dòng nào", async () => {
    expect((await getOrganization(withSession(`${BASE}/${a.organizationId}`, op.token), params(a.organizationId))).status).toBe(200)
    expect((await getCredits(withSession(`${BASE}/${a.organizationId}/credits`, op.token), params(a.organizationId))).status).toBe(200)

    const rows = await prisma.platform_access_logs.findMany({ where: { organization_id: a.organizationId }, orderBy: { created_at: "asc" } })
    expect(rows.map((r) => [r.purpose, r.operator_id, r.method])).toEqual([
      ["org.profile.read", op.userId, "GET"],
      ["org.credits.read", op.userId, "GET"],
    ])
    expect(await prisma.platform_access_logs.count({ where: { organization_id: b.organizationId } })).toBe(0)
  })

  it("chủ tổ chức A thấy danh sách bằng chữ dễ hiểu; chủ tổ chức B không thấy dòng của A", async () => {
    await getCredits(withSession(`${BASE}/${a.organizationId}/credits`, op.token), params(a.organizationId))
    const res = await list(a)
    expect(res.status).toBe(200)
    const body = (await readJson(res)) as unknown as AccessList
    expect(body.data).toHaveLength(1)
    expect(body.data[0]).toMatchObject({ purpose: "org.credits.read", purpose_label: "Xem số dư credit" })
    expect(((await readJson(await list(b))) as unknown as AccessList).data).toEqual([])
  })

  it("nhân viên không có G9 không xem được (403)", async () => {
    const sale = await addStaffWithSession(a, "sale", "sale")
    expect((await list(a, sale.token)).status).toBe(403)
  })

  it("tổ chức không tồn tại: Console vẫn trả 404 như cũ, không ghi dòng nào", async () => {
    const res = await getOrganization(withSession(`${BASE}/khong-ton-tai`, op.token), params("khong-ton-tai"))
    expect(res.status).toBe(404)
    expect(await prisma.platform_access_logs.count()).toBe(0)
  })
})
