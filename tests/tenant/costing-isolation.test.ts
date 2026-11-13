import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as getMaterials, POST as postMaterial } from "@/app/api/v1/costing/materials/route"
import { PATCH as patchMaterial } from "@/app/api/v1/costing/materials/[id]/route"
import { GET as getHistory } from "@/app/api/v1/costing/materials/[id]/history/route"
import { GET as getRecipe, PUT as putRecipe } from "@/app/api/v1/costing/recipes/[productId]/route"
import { GET as getCost } from "@/app/api/v1/costing/products/[productId]/cost/route"
import { GET as getNeeds } from "@/app/api/v1/costing/needs/route"
import { POST as postPurchase } from "@/app/api/v1/costing/needs/purchase/route"
import { POST as postPrice } from "@/app/api/v1/costing/products/[productId]/price/route"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1/costing"
const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) })

async function newMaterial(t: Tenant, body: Record<string, unknown>) {
  const res = await postMaterial(withSession(`${BASE}/materials`, t.token, { method: "POST", body: JSON.stringify(body) }))
  expect(res.status).toBe(201)
  return ((await res.json()) as { data: { id: string } }).data.id
}

async function newProduct(t: Tenant, code: string, attributes: Record<string, unknown>) {
  const p = await prisma.products.create({
    data: { organization_id: t.organizationId, code, name: `Mẫu ${code}`, status: "ACTIVE", attributes: attributes as never },
  })
  return p.id
}

/** Nhóm công cụ 6 (#31–#35): dữ liệu nguyên liệu/công thức không lọt sang tổ chức khác — khác tổ chức là 404. */
describe("tính giá — cách ly tổ chức", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("tinh-gia-a")
    b = await createTenant("tinh-gia-b")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("nguyên liệu và lịch sử giá chỉ thấy trong tổ chức mình; sửa của tổ chức khác → 404", async () => {
    const roseA = await newMaterial(a, { name: "Hoa hồng", unit: "cành", category_key: "MAIN_FLOWER", unit_cost_vnd: 10000 })
    await newMaterial(b, { name: "Hoa cúc", unit: "cành", category_key: "SECONDARY_FLOWER" })

    const listB = (await (await getMaterials(withSession(`${BASE}/materials`, b.token))).json()) as { data: { name: string }[] }
    expect(listB.data.map((m) => m.name)).toEqual(["Hoa cúc"])

    const patchFromB = await patchMaterial(
      withSession(`${BASE}/materials/${roseA}`, b.token, { method: "PATCH", body: JSON.stringify({ unit_cost_vnd: 1 }) }),
      params({ id: roseA }),
    )
    expect(patchFromB.status).toBe(404)
    expect((await getHistory(withSession(`${BASE}/materials/${roseA}/history`, b.token), params({ id: roseA }))).status).toBe(404)

    await patchMaterial(withSession(`${BASE}/materials/${roseA}`, a.token, { method: "PATCH", body: JSON.stringify({ unit_cost_vnd: 12000 }) }), params({ id: roseA }))
    const hist = (await (await getHistory(withSession(`${BASE}/materials/${roseA}/history`, a.token), params({ id: roseA }))).json()) as { data: unknown[] }
    expect(hist.data).toHaveLength(2)
    expect(await prisma.material_price_history.count({ where: { organization_id: b.organizationId } })).toBe(0)
  })

  it("không lưu được công thức dùng nguyên liệu của tổ chức khác, không đọc công thức/giá vốn của tổ chức khác", async () => {
    const leafB = await newMaterial(b, { name: "Lá bạc", unit: "nhánh", category_key: "FOLIAGE", unit_cost_vnd: 2000 })
    const roseA = await newMaterial(a, { name: "Hoa hồng", unit: "cành", category_key: "MAIN_FLOWER", unit_cost_vnd: 10000 })
    const productA = await newProduct(a, "A1", { price: 500000, craft_complexity: "MEDIUM", bom: { flowers: [{ name: "Hoa hồng", quantity: 10 }] } })

    const draft = (await (await getRecipe(withSession(`${BASE}/recipes/${productA}`, a.token), params({ productId: productA }))).json()) as {
      data: { draft: { materialId: string | null; quantity: number }[] }
    }
    expect(draft.data.draft).toEqual([expect.objectContaining({ materialId: roseA, quantity: 10 })])

    const crossLine = await putRecipe(
      withSession(`${BASE}/recipes/${productA}`, a.token, { method: "PUT", body: JSON.stringify({ lines: [{ material_id: leafB, quantity: 1 }] }) }),
      params({ productId: productA }),
    )
    expect(crossLine.status).toBe(404)
    expect(await prisma.product_recipes.count()).toBe(0)

    const ok = await putRecipe(
      withSession(`${BASE}/recipes/${productA}`, a.token, { method: "PUT", body: JSON.stringify({ lines: [{ material_id: roseA, quantity: 10 }] }) }),
      params({ productId: productA }),
    )
    expect(ok.status).toBe(200)
    expect(await prisma.product_recipe_items.count({ where: { organization_id: a.organizationId } })).toBe(1)

    expect((await getRecipe(withSession(`${BASE}/recipes/${productA}`, b.token), params({ productId: productA }))).status).toBe(404)
    expect((await getCost(withSession(`${BASE}/products/${productA}/cost`, b.token), params({ productId: productA }))).status).toBe(404)

    const cost = (await (await getCost(withSession(`${BASE}/products/${productA}/cost`, a.token), params({ productId: productA }))).json()) as {
      data: { cost: { materialVnd: number; complete: boolean }; scenarios: { key: string }[] }
    }
    expect(cost.data.cost.materialVnd).toBe(100000)
    expect(cost.data.cost.complete).toBe(true)
    expect(cost.data.scenarios.map((s) => s.key)).toContain("RECOMMENDED")
  })

  it("dự toán mua chỉ cộng đơn của chính tổ chức", async () => {
    const roseA = await newMaterial(a, { name: "Hoa hồng", unit: "cành", category_key: "MAIN_FLOWER", unit_cost_vnd: 10000, on_hand_qty: 0 })
    const productA = await newProduct(a, "A2", {})
    await putRecipe(
      withSession(`${BASE}/recipes/${productA}`, a.token, { method: "PUT", body: JSON.stringify({ lines: [{ material_id: roseA, quantity: 5 }], waste_percent: 0 }) }),
      params({ productId: productA }),
    )
    for (const t of [a, b]) {
      await prisma.orders.create({
        data: {
          organization_id: t.organizationId,
          code: `DH-${t.organizationId.slice(0, 4)}`,
          status: "CONFIRMED",
          total_vnd: 500000,
          balance_vnd: 500000,
          created_by: t.userId,
          delivery_window: { date: "2026-11-02" },
          items: { create: [{ organization_id: t.organizationId, product_id: productA, quantity: 2, unit_price_vnd: 250000 }] },
        },
      })
    }
    const needs = (await (await getNeeds(withSession(`${BASE}/needs?from=2026-11-01&to=2026-11-03`, a.token))).json()) as {
      data: { needs: { toBuyQty: number }[]; orderCount: number }
    }
    expect(needs.data.orderCount).toBe(1)
    expect(needs.data.needs[0]?.toBuyQty).toBe(10)
  })

  it("áp giá và đánh dấu đã mua: tổ chức khác → 404, không ghi gì; tổ chức mình ghi nhật ký + lịch sử", async () => {
    const productA = await newProduct(a, "A3", { price: 100000 })
    const roseA = await newMaterial(a, { name: "Hoa hồng", unit: "cành", category_key: "MAIN_FLOWER", unit_cost_vnd: 10000, on_hand_qty: 2 })
    const priceReq = (t: Tenant) =>
      postPrice(withSession(`${BASE}/products/${productA}/price`, t.token, { method: "POST", body: JSON.stringify({ price_vnd: 350000, scenario: "RECOMMENDED" }) }), params({ productId: productA }))
    expect((await priceReq(b)).status).toBe(404)
    expect((await priceReq(a)).status).toBe(200)
    const product = await prisma.products.findUniqueOrThrow({ where: { id: productA } })
    expect((product.attributes as { price: number }).price).toBe(350000)
    expect(await prisma.audit_logs.count({ where: { organization_id: a.organizationId, action: "product.price.apply" } })).toBe(1)
    expect(await prisma.audit_logs.count({ where: { organization_id: b.organizationId } })).toBe(0)

    const buy = (t: Tenant) =>
      postPurchase(withSession(`${BASE}/needs/purchase`, t.token, { method: "POST", body: JSON.stringify({ items: [{ material_id: roseA, quantity: 8, unit_cost_vnd: 11000 }] }) }))
    expect((await buy(b)).status).toBe(404)
    expect((await buy(a)).status).toBe(200)
    const rose = await prisma.materials.findUniqueOrThrow({ where: { id: roseA } })
    expect(Number(rose.on_hand_qty)).toBe(10)
    expect(Number(rose.unit_cost_vnd)).toBe(11000)
    expect(await prisma.material_price_history.count({ where: { material_id: roseA, source: "PURCHASE" } })).toBe(1)
  })
})
