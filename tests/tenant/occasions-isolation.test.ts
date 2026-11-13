import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as listOccasions, POST as createOccasion } from "@/app/api/v1/occasions/route"
import { PATCH as patchOccasion } from "@/app/api/v1/occasions/[id]/route"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1/occasions"

type OccasionRow = { id: string; code: string; name: string; is_active: boolean }

const params = (id: string) => ({ params: Promise.resolve({ id }) })

async function list(token: string): Promise<OccasionRow[]> {
  const res = await listOccasions(withSession(BASE, token))
  expect(res.status).toBe(200)
  return (await readJson(res)).data as OccasionRow[]
}

describe("cách ly tenant — danh mục dịp tặng hoa (1.7)", () => {
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

  it("tổ chức mới có sẵn danh sách dịp phổ biến", async () => {
    const codes = (await list(a.token)).map((o) => o.code)
    expect(codes).toEqual(expect.arrayContaining(["valentine", "women_day", "wedding", "opening", "condolence"]))
  })

  it("thêm dịp riêng: chỉ tổ chức đã thêm thấy", async () => {
    const res = await createOccasion(
      withSession(BASE, a.token, { method: "POST", body: JSON.stringify({ code: "sinh_nhat_sep", name: "Sinh nhật Sếp" }) })
    )
    expect(res.status).toBe(201)

    expect((await list(a.token)).some((o) => o.code === "sinh_nhat_sep")).toBe(true)
    expect((await list(b.token)).some((o) => o.code === "sinh_nhat_sep")).toBe(false)
  })

  it("sửa tên và tắt dịp có hiệu lực; tổ chức khác sửa → 404, không đổi gì", async () => {
    const valentine = (await list(a.token)).find((o) => o.code === "valentine")!

    const fromB = await patchOccasion(
      withSession(`${BASE}/${valentine.id}`, b.token, { method: "PATCH", body: JSON.stringify({ is_active: false }) }),
      params(valentine.id)
    )
    expect(fromB.status).toBe(404)
    expect((await list(a.token)).find((o) => o.id === valentine.id)?.is_active).toBe(true)

    const res = await patchOccasion(
      withSession(`${BASE}/${valentine.id}`, a.token, { method: "PATCH", body: JSON.stringify({ name: "Lễ Tình nhân", is_active: false }) }),
      params(valentine.id)
    )
    expect(res.status).toBe(200)
    const after = (await list(a.token)).find((o) => o.id === valentine.id)!
    expect(after).toMatchObject({ name: "Lễ Tình nhân", is_active: false })
  })

  it("Sale không thêm, không sửa được dịp (403)", async () => {
    const sale = await addStaffWithSession(a, "sale", "sale")
    const created = await createOccasion(
      withSession(BASE, sale.token, { method: "POST", body: JSON.stringify({ code: "khac", name: "Khác" }) })
    )
    expect(created.status).toBe(403)

    const target = (await list(a.token))[0]!
    const patched = await patchOccasion(
      withSession(`${BASE}/${target.id}`, sale.token, { method: "PATCH", body: JSON.stringify({ name: "Đổi" }) }),
      params(target.id)
    )
    expect(patched.status).toBe(403)
  })

  it("mã dịp trùng trong cùng tổ chức bị từ chối, khác tổ chức thì được", async () => {
    const body = JSON.stringify({ code: "khai_truong_moi", name: "Khai trương chi nhánh" })
    expect((await createOccasion(withSession(BASE, a.token, { method: "POST", body }))).status).toBe(201)
    expect((await createOccasion(withSession(BASE, a.token, { method: "POST", body }))).status).toBe(409)
    expect((await createOccasion(withSession(BASE, b.token, { method: "POST", body }))).status).toBe(201)
  })
})
