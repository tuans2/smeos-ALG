import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as productGet, PATCH as productPatch } from "@/app/api/v1/products/[id]/route"
import { GET as productList, POST as productCreate } from "@/app/api/v1/products/route"
import { POST as bulkStatus } from "@/app/api/v1/products/bulk-status/route"
import { GET as productExport } from "@/app/api/v1/products/export/route"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Công cụ 53 giai đoạn 4–5 (PO 30/10/2026): trường bán hàng (giá vốn cần `L5`), lọc toàn kho,
 * xuất CSV và đổi trạng thái hàng loạt — dữ liệu tổ chức khác không bao giờ lộ.
 */
const params = (id: string) => ({ params: Promise.resolve({ id }) })
const post = (body: unknown) => ({ method: "POST", body: JSON.stringify(body) })
const patch = (body: unknown) => ({ method: "PATCH", body: JSON.stringify(body) })
const PRODUCTS = "http://localhost/api/v1/products"

describe("sản phẩm: trường bán hàng, xuất, hàng loạt", () => {
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

  async function createWithCost(code: string, name = "Bó hồng") {
    const res = await productCreate(withSession(PRODUCTS, a.token, post({
      code, name, status: "ACTIVE", attributes: { price: 450000 },
      barcode: "8930001", cost_price_vnd: 150000, vat_percent: 8, weight_grams: 900, tags: ["Sinh nhật", "sinh nhật"],
    })))
    expect(res.status).toBe(201)
    return readJson(res)
  }

  it("giá vốn: Điều hành thấy; Sale không thấy và không ghi được", async () => {
    const created = await createWithCost("CM-1")
    const id = created.id as string
    const own = await readJson(await productGet(withSession(`${PRODUCTS}/${id}`, a.token), params(id)))
    expect(own.commerce).toEqual({ barcode: "8930001", cost_price_vnd: 150000, vat_percent: 8, weight_grams: 900, tags: ["Sinh nhật"] })

    const sale = await addStaffWithSession(a, "sale", "sale")
    const seen = await readJson(await productGet(withSession(`${PRODUCTS}/${id}`, sale.token), params(id)))
    expect((seen.commerce as Record<string, unknown>).cost_price_vnd).toBeNull()
    expect(seen.redacted_fields).toContain("cost_price_vnd")

    const write = await productCreate(withSession(PRODUCTS, sale.token, post({ code: "CM-2", name: "x", cost_price_vnd: 1 })))
    expect(write.status).toBe(403)
  })

  it("tổ chức khác không đọc, không sửa được trường bán hàng → 404", async () => {
    const created = await createWithCost("CM-3")
    const id = created.id as string
    expect((await productGet(withSession(`${PRODUCTS}/${id}`, b.token), params(id))).status).toBe(404)
    expect((await productPatch(withSession(`${PRODUCTS}/${id}`, b.token, patch({ barcode: "99999" })), params(id))).status).toBe(404)
  })

  it("lọc toàn kho chỉ quét dữ liệu tổ chức mình", async () => {
    await createWithCost("CM-4", "Kệ hoa viếng")
    const res = await readJson(await productList(withSession(`${PRODUCTS}?occasion=chia_buon`, b.token)))
    expect(res.total).toBe(0)
    const mine = await readJson(await productList(withSession(`${PRODUCTS}?occasion=chia_buon`, a.token)))
    expect(mine.total).toBe(1)
  })

  it("đổi trạng thái hàng loạt: mã của tổ chức khác báo không tìm thấy, không bị đổi", async () => {
    const created = await createWithCost("CM-5")
    const id = created.id as string
    const res = await readJson(await bulkStatus(withSession(`${PRODUCTS}/bulk-status`, b.token, post({ ids: [id], status: "DRAFT" }))))
    expect(res.updated).toEqual([])
    expect(res.failed).toEqual([{ id, reason: "Không tìm thấy" }])
    const still = await readJson(await productGet(withSession(`${PRODUCTS}/${id}`, a.token), params(id)))
    expect(still.status).toBe("ACTIVE")
  })

  it("xuất CSV không chứa sản phẩm tổ chức khác", async () => {
    await createWithCost("CM-6")
    const res = await productExport(withSession(`${PRODUCTS}/export`, b.token))
    expect(res.status).toBe(200)
    expect(await res.text()).not.toContain("CM-6")
    const mine = await productExport(withSession(`${PRODUCTS}/export`, a.token))
    expect(await mine.text()).toContain("CM-6")
  })
})
