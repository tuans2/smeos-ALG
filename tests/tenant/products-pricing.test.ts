import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as getProductById, PATCH as patchProduct } from "@/app/api/v1/products/[id]/route"
import { GET as listProducts, POST as createProduct } from "@/app/api/v1/products/route"
import { GET as getPricingRules, PUT as putPricingRules } from "@/app/api/v1/pricing-rules/route"
import { getProduct } from "@/modules/products/use-cases/get-product"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1"

/**
 * Cách ly tenant cho M02 (giá) và M03 (tra cứu sản phẩm) — P6. Cùng khuôn
 * `cach-ly-endpoint.test.ts`: dựng hai tổ chức qua đúng luồng đăng ký thật,
 * gọi endpoint bằng ngữ cảnh phiên của tổ chức kia, kỳ vọng 404 (không phải
 * 403 — bản ghi thuộc tổ chức khác coi như không tồn tại, `YC-T4`).
 *
 * Người sáng lập (vai `dieu_hanh`) có sẵn `L1`–`L6` theo mặc định
 * (`capability-catalog.ts`), nên `a.token`/`b.token` gọi thẳng được không
 * cần cấp quyền thêm.
 */
describe("cách ly tenant — sản phẩm và quy tắc giá (P6)", () => {
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

  it("POST /products rồi GET /products/:id chỉ đọc lại được bằng chính tổ chức đã tạo", async () => {
    const created = await readJson(
      await createProduct(
        withSession(`${BASE}/products`, a.token, {
          method: "POST",
          body: JSON.stringify({ code: "BHBB0001", name: "Bó hoa baby" }),
        })
      )
    )
    const id = created.id as string

    const ownRead = await getProductById(withSession(`${BASE}/products/${id}`, a.token), {
      params: Promise.resolve({ id }),
    })
    expect(ownRead.status).toBe(200)
    expect((await readJson(ownRead)).code).toBe("BHBB0001")

    const otherRead = await getProductById(withSession(`${BASE}/products/${id}`, b.token), {
      params: Promise.resolve({ id }),
    })
    expect(otherRead.status).toBe(404)
  })

  it("mã sản phẩm trùng trong cùng tổ chức trả 409, khác tổ chức thì không đụng nhau", async () => {
    const first = await createProduct(
      withSession(`${BASE}/products`, a.token, {
        method: "POST",
        body: JSON.stringify({ code: "BHBB0001", name: "Bó hoa baby" }),
      })
    )
    expect(first.status).toBe(201)

    const duplicate = await createProduct(
      withSession(`${BASE}/products`, a.token, {
        method: "POST",
        body: JSON.stringify({ code: "BHBB0001", name: "Bó hoa baby (bản hai)" }),
      })
    )
    expect(duplicate.status).toBe(409)

    // Cùng mã ở tổ chức khác — không phải cùng một hàng, không xung đột.
    const sameCodeOtherOrg = await createProduct(
      withSession(`${BASE}/products`, b.token, {
        method: "POST",
        body: JSON.stringify({ code: "BHBB0001", name: "Bó hoa baby của B" }),
      })
    )
    expect(sameCodeOtherOrg.status).toBe(201)
  })

  it("GET /products chỉ liệt kê sản phẩm của chính tổ chức gọi", async () => {
    await createProduct(
      withSession(`${BASE}/products`, a.token, {
        method: "POST",
        body: JSON.stringify({ code: "A1", name: "Sản phẩm của A" }),
      })
    )
    await createProduct(
      withSession(`${BASE}/products`, b.token, {
        method: "POST",
        body: JSON.stringify({ code: "B1", name: "Sản phẩm của B" }),
      })
    )

    const bodyA = await readJson(await listProducts(withSession(`${BASE}/products`, a.token)))
    const codesA = (bodyA.data as Array<{ code: string }>).map((p) => p.code)
    expect(codesA).toEqual(["A1"])

    const bodyB = await readJson(await listProducts(withSession(`${BASE}/products`, b.token)))
    const codesB = (bodyB.data as Array<{ code: string }>).map((p) => p.code)
    expect(codesB).toEqual(["B1"])
  })

  it("GET /products lọc theo status", async () => {
    await createProduct(
      withSession(`${BASE}/products`, a.token, {
        method: "POST",
        body: JSON.stringify({ code: "A1", name: "Nháp", status: "DRAFT" }),
      })
    )
    await createProduct(
      withSession(`${BASE}/products`, a.token, {
        method: "POST",
        body: JSON.stringify({ code: "A2", name: "Đang bán", status: "ACTIVE" }),
      })
    )

    const body = await readJson(
      await listProducts(withSession(`${BASE}/products?status=ACTIVE`, a.token))
    )
    const codes = (body.data as Array<{ code: string }>).map((p) => p.code)
    expect(codes).toEqual(["A2"])
  })

  it("PATCH /products/:id sang tổ chức của người khác trả 404, không sửa được", async () => {
    const created = await readJson(
      await createProduct(
        withSession(`${BASE}/products`, a.token, {
          method: "POST",
          body: JSON.stringify({ code: "A1", name: "Tên gốc" }),
        })
      )
    )
    const id = created.id as string

    const response = await patchProduct(
      withSession(`${BASE}/products/${id}`, b.token, {
        method: "PATCH",
        body: JSON.stringify({ name: "Bị đổi bởi tổ chức khác" }),
      }),
      { params: Promise.resolve({ id }) }
    )
    expect(response.status).toBe(404)

    const stillOriginal = await readJson(
      await getProductById(withSession(`${BASE}/products/${id}`, a.token), {
        params: Promise.resolve({ id }),
      })
    )
    expect(stillOriginal.name).toBe("Tên gốc")
  })

  it("PUT /pricing-rules rồi GET chỉ đọc lại được bằng chính tổ chức đã ghi", async () => {
    const put = await putPricingRules(
      withSession(`${BASE}/pricing-rules`, a.token, {
        method: "PUT",
        body: JSON.stringify({ key: "optimal_price_ratio", value: 0.6 }),
      })
    )
    expect(put.status).toBe(200)
    expect((await readJson(put)).optimal_price_ratio).toBe(0.6)

    const ownRead = await readJson(
      await getPricingRules(withSession(`${BASE}/pricing-rules`, a.token))
    )
    expect(ownRead.optimal_price_ratio).toBe(0.6)

    // B chưa từng PUT — vẫn thấy mặc định, không thấy giá trị A vừa ghi.
    const otherRead = await readJson(
      await getPricingRules(withSession(`${BASE}/pricing-rules`, b.token))
    )
    expect(otherRead.optimal_price_ratio).toBe(0.5)
  })

  it("PUT /pricing-rules ghi thêm một dòng mới — dòng mới nhất thắng, không sửa dòng cũ", async () => {
    await putPricingRules(
      withSession(`${BASE}/pricing-rules`, a.token, {
        method: "PUT",
        body: JSON.stringify({ key: "optimal_price_ratio", value: 0.55 }),
      })
    )
    const secondPut = await putPricingRules(
      withSession(`${BASE}/pricing-rules`, a.token, {
        method: "PUT",
        body: JSON.stringify({ key: "optimal_price_ratio", value: 0.65 }),
      })
    )
    expect((await readJson(secondPut)).optimal_price_ratio).toBe(0.65)
  })

  it("PUT /pricing-rules với hình dạng sai trả 400 VALIDATION_FAILED", async () => {
    const response = await putPricingRules(
      withSession(`${BASE}/pricing-rules`, a.token, {
        method: "PUT",
        body: JSON.stringify({ key: "optimal_price_ratio", value: 1.5 }),
      })
    )
    expect(response.status).toBe(400)
    expect((await readJson(response)).error).toMatchObject({ code: "VALIDATION_FAILED" })
  })

  it("PUT /pricing-rules với khoá không nhận diện được trả 400", async () => {
    const response = await putPricingRules(
      withSession(`${BASE}/pricing-rules`, a.token, {
        method: "PUT",
        body: JSON.stringify({ key: "khong-ton-tai", value: 1 }),
      })
    )
    expect(response.status).toBe(400)
  })

  it("không có L5 thì GET /products/:id không thấy khối pricing (M03, redaction thật qua repository)", async () => {
    const created = await readJson(
      await createProduct(
        withSession(`${BASE}/products`, a.token, {
          method: "POST",
          body: JSON.stringify({ code: "A1", name: "Sản phẩm" }),
        })
      )
    )
    await putPricingRules(
      withSession(`${BASE}/pricing-rules`, a.token, {
        method: "PUT",
        body: JSON.stringify({ key: "optimal_price_ratio", value: 0.6 }),
      })
    )

    const withoutPricingRead = { ...a.ctx, capabilities: new Set(["L1"]) }
    const result = await getProduct(withoutPricingRead, created.id as string)
    expect(result.pricing).toBeNull()
    expect(result.redacted_fields).toContain("pricing")

    const withPricingRead = { ...a.ctx, capabilities: new Set(["L1", "L5"]) }
    const withPricing = await getProduct(withPricingRead, created.id as string)
    expect(withPricing.pricing?.optimal_price_ratio).toBe(0.6)
  })
})
