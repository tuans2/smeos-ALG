import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { POST as catalogLead } from "@/app/api/v1/public/catalog/[slug]/lead/route"
import { POST as catalogOrder } from "@/app/api/v1/public/catalog/[slug]/order/route"
import { GET as publicCatalog } from "@/app/api/v1/public/catalog/[slug]/route"
import * as R from "@/app/api/v1/public/_contracts/responses-catalog"
import { createCatalogLink } from "@/modules/catalog-links/use-cases/create-catalog-link"
import { ProductRepository } from "@/modules/products/infra/product-repository"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * Hợp đồng phản hồi — Catalog công khai `/public/catalog/{slug}` (audit API đợt 6). Ba route nằm trong vùng
 * Catalog đóng băng: test chỉ GỌI route, không sửa.
 */
const BASE = "http://localhost/api/v1/public/catalog"
const params = (slug: string) => ({ params: Promise.resolve({ slug }) })
const post = (url: string, body: unknown) => new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })

describe("hợp đồng — catalog công khai", () => {
  let a: Tenant
  let productId: string

  beforeAll(async () => {
    await resetDatabase()
    a = await createTenant("catalog-cong-khai")
    const product = await new ProductRepository().create(a.ctx, { code: "HD-CAT1", name: "Bó hoa hợp đồng", status: "ACTIVE", attributes: { price: 450000 } })
    productId = product.id
    await createCatalogLink({ ...a.ctx, capabilities: new Set([...a.ctx.capabilities, "J1"]) }, { slug: "hop-dong-cat", name: "Bộ sưu tập", description: "Mô tả", filters: null })
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("GET /public/catalog/{slug} — có; không có → 404", async () => {
    await expectContract(await publicCatalog(new Request(`${BASE}/hop-dong-cat`), params("hop-dong-cat")), 200, R.publicCatalogResponse, "public-catalog")
    expect((await publicCatalog(new Request(`${BASE}/khong-co`), params("khong-co"))).status).toBe(404)
  })

  it("POST /public/catalog/{slug}/lead", async () => {
    await expectContract(
      await catalogLead(post(`${BASE}/hop-dong-cat/lead`, { name: "Lan", phone: "0901234567", consent: true, message: "Tư vấn giúp", utm: { source: "fb" } }), params("hop-dong-cat")),
      201, R.catalogLeadResponse, "catalog-lead"
    )
  })

  it("POST /public/catalog/{slug}/order", async () => {
    await expectContract(
      await catalogOrder(post(`${BASE}/hop-dong-cat/order`, { productId, quantity: 1, name: "Mai", phone: "0907654321", address: "12 Lê Lợi, Q1", note: "Giao giờ hành chính" }), params("hop-dong-cat")),
      201, R.catalogOrderResponse, "catalog-order"
    )
  })
})
