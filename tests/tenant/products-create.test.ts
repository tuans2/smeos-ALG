import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as getProduct } from "@/app/api/v1/products/[id]/route"
import { GET as listProducts, POST as createProduct } from "@/app/api/v1/products/route"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/** Checklist ALG 2.1 — tạo thẻ mẫu: mã tự sinh phía máy chủ, dịp và kích thước đọc lại được. */

const BASE = "http://localhost/api/v1/products"

describe("tạo thẻ sản phẩm mẫu", () => {
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

  const create = (token: string, body: Record<string, unknown>) =>
    createProduct(withSession(BASE, token, { method: "POST", body: JSON.stringify(body) }))

  it("để trống mã → máy chủ sinh mã AUTO- duy nhất; nhập mã trùng → 409", async () => {
    const codes = new Set<string>()
    for (const name of ["Bó hồng", "Giỏ lan"]) {
      const res = await create(a.token, { name, code: "" })
      expect(res.status).toBe(201)
      codes.add(((await readJson(res)) as { code: string }).code)
    }
    expect([...codes].every((c) => /^AUTO-[0-9A-F]{8}$/.test(c))).toBe(true)
    expect(codes.size).toBe(2)

    expect((await create(a.token, { name: "Hộp hoa", code: "SP-01" })).status).toBe(201)
    expect((await create(a.token, { name: "Hộp hoa 2", code: "SP-01" })).status).toBe(409)
    // Mã trùng ở tổ chức khác không ảnh hưởng
    expect((await create(b.token, { name: "Hộp hoa", code: "SP-01" })).status).toBe(201)
  })

  it("dịp và kích thước lưu trong thẻ, lọc được theo dịp; tổ chức khác không xem được", async () => {
    const res = await create(a.token, {
      name: "Lẵng khai trương", attributes: { occasionCodes: ["KHAI_TRUONG"], dimensions: { heightCm: 120, widthCm: 60 } },
    })
    const id = ((await readJson(res)) as { id: string }).id
    const read = await readJson(await getProduct(withSession(`${BASE}/${id}`, a.token), { params: Promise.resolve({ id }) }))
    expect((read as { attributes: Record<string, unknown> }).attributes).toMatchObject({
      occasionCodes: ["KHAI_TRUONG"], dimensions: { heightCm: 120, widthCm: 60 },
    })
    const filtered = (await readJson(await listProducts(withSession(`${BASE}?occasion_code=KHAI_TRUONG`, a.token)))).data as { id: string }[]
    expect(filtered.map((p) => p.id)).toEqual([id])
    expect((await getProduct(withSession(`${BASE}/${id}`, b.token), { params: Promise.resolve({ id }) })).status).toBe(404)
  })
})
