import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { PATCH as patchProduct } from "@/app/api/v1/products/[id]/route"
import { GET as listProducts } from "@/app/api/v1/products/route"
import { POST as checkAvailability } from "@/app/api/v1/public/greeting-catalog/[id]/check-availability/route"
import { DELETE as purge } from "@/app/api/v1/storage/trash/[id]/route"
import { POST as moveToTrash } from "@/app/api/v1/storage/trash/route"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { getPublicGreetingCatalog } from "@/modules/greeting-card/use-cases/get-public-greeting-catalog"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/** Checklist ALG 2.3 — Tạm ngưng / Đang bán / Lưu trữ; mẫu đã có đơn không xoá vĩnh viễn. */

const BASE = "http://localhost/api/v1"

describe("trạng thái mẫu sản phẩm", () => {
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

  const product = (code: string) => prisma.products.create({ data: { organization_id: a.organizationId, code, name: code, status: "ACTIVE" } })
  const publicCount = async (catalogId: string) => {
    const res = await getPublicGreetingCatalog(catalogId)
    return res.status === "NOT_FOUND" ? -1 : res.products.length
  }
  const setStatus = (token: string, id: string, status: string) =>
    patchProduct(withSession(`${BASE}/products/${id}`, token, { method: "PATCH", body: JSON.stringify({ status }) }), { params: Promise.resolve({ id }) })

  it("tạm ngưng: vẫn thấy trong kho nội bộ, ẩn khỏi Thẻ Chào và không đặt được; mở bán lại thì hiện", async () => {
    const p = await product("SP-1")
    const catalog = await new GreetingCardRepository().createCatalog(a.ctx, { code: `bo-${randomUUID().slice(0, 6)}`, name: "Bộ", productIds: [p.id], createdBy: a.userId })

    expect((await setStatus(b.token, p.id, "PAUSED")).status).toBe(404)
    expect((await setStatus(a.token, p.id, "PAUSED")).status).toBe(200)

    const internal = (await readJson(await listProducts(withSession(`${BASE}/products`, a.token)))).data as { code: string; status: string }[]
    expect(internal.find((x) => x.code === "SP-1")?.status).toBe("PAUSED")
    expect(await publicCount(catalog.id)).toBe(0)

    const check = await checkAvailability(new Request(`${BASE}/public/greeting-catalog/${catalog.id}/check-availability`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId: p.id }),
    }), { params: Promise.resolve({ id: catalog.id }) })
    expect(check.status).toBe(200)
    expect(((await check.json()) as { available: boolean }).available).toBe(false)

    expect((await setStatus(a.token, p.id, "ACTIVE")).status).toBe(200)
    expect(await publicCount(catalog.id)).toBe(1)
  })

  it("mẫu đã có đơn: lưu trữ được nhưng xoá vĩnh viễn → 409; mẫu chưa có đơn xoá được", async () => {
    const used = await product("SP-CO-DON")
    const unused = await product("SP-MOI")
    await prisma.orders.create({
      data: {
        id: randomUUID(), organization_id: a.organizationId, code: "DH-1", status: "CONFIRMED", created_by: a.userId,
        total_vnd: 500_000, paid_vnd: 0, balance_vnd: 500_000,
        items: { create: [{ organization_id: a.organizationId, product_id: used.id, quantity: 1, unit_price_vnd: 500_000 }] },
      },
    })
    for (const id of [used.id, unused.id]) {
      const res = await moveToTrash(withSession(`${BASE}/storage/trash`, a.token, { method: "POST", body: JSON.stringify({ id, type: "PRODUCT" }) }))
      expect(res.status).toBe(200)
    }
    const del = (id: string) => purge(withSession(`${BASE}/storage/trash/${id}?type=PRODUCT`, a.token, { method: "DELETE" }), { params: Promise.resolve({ id }) })
    expect((await del(used.id)).status).toBe(409)
    expect((await prisma.products.findUniqueOrThrow({ where: { id: used.id } })).status).toBe("ARCHIVED")
    expect((await del(unused.id)).status).toBe(200)
    expect(await prisma.products.findUnique({ where: { id: unused.id } })).toBeNull()
  })
})
