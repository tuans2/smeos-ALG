import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as postMaterial } from "@/app/api/v1/costing/materials/route"
import { GET as getCost } from "@/app/api/v1/costing/products/[productId]/cost/route"
import { PUT as putRecipe } from "@/app/api/v1/costing/recipes/[productId]/route"
import { POST as quoteRoute } from "@/app/api/v1/orders/[id]/quote/route"
import { PUT as putPricingRules } from "@/app/api/v1/pricing-rules/route"
import { POST as createQuotation } from "@/app/api/v1/quotations/route"
import { POST as createOrderRoute } from "@/app/api/v1/orders/route"
import { ingestOrder } from "@/modules/orders/use-cases/ingest-order"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/** Checklist ALG 3.4, 9.11 — giá dưới sàn không lưu được nếu chưa có Điều hành (C10). */

const BASE = "http://localhost/api/v1"
const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) })

describe("chặn giá dưới sàn", () => {
  let a: Tenant
  let sale: { userId: string; token: string }
  let productId: string
  let floorVnd: number
  let ceilingVnd: number

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    sale = await addStaffWithSession(a, "sale", "lan")

    const material = await postMaterial(withSession(`${BASE}/costing/materials`, a.token, {
      method: "POST", body: JSON.stringify({ name: "Hoa hồng", unit: "cành", category_key: "MAIN_FLOWER", unit_cost_vnd: 10000 }),
    }))
    const materialId = ((await readJson(material)).data as { id: string }).id
    productId = (await prisma.products.create({
      data: { organization_id: a.organizationId, code: "SAN-1", name: "Bó hồng 10 cành", status: "ACTIVE", attributes: { price: 500000, craft_complexity: "MEDIUM" } as never },
    })).id
    const recipe = await putRecipe(withSession(`${BASE}/costing/recipes/${productId}`, a.token, {
      method: "PUT", body: JSON.stringify({ lines: [{ material_id: materialId, quantity: 10 }] }),
    }), params({ productId }))
    expect(recipe.status).toBe(200)

    // Sàn = giá vốn × 1,0
    const rule = await putPricingRules(withSession(`${BASE}/pricing-rules`, a.token, {
      method: "PUT", body: JSON.stringify({ key: "floor_ceiling_ratio", value: { floorRatio: 1, ceilingRatio: 3 } }),
    }))
    expect(rule.status).toBe(200)
    const cost = await readJson(await getCost(withSession(`${BASE}/costing/products/${productId}/cost`, a.token), params({ productId })))
    const costVnd = ((cost.data as { cost: { totalVnd: number } }).cost).totalVnd
    expect(costVnd).toBeGreaterThan(0)
    floorVnd = Math.ceil(costVnd / 1000) * 1000
    ceilingVnd = Math.floor((costVnd * 3) / 1000) * 1000
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function draftOrder() {
    return (await ingestOrder(a.ctx, { source: "MANUAL", items: [{ productId, description: "Bó hồng", quantity: 1, unitPriceVnd: 0 }] })).id
  }
  const quote = (token: string, orderId: string, totalVnd: number) =>
    quoteRoute(withSession(`${BASE}/orders/${orderId}/quote`, token, { method: "POST", body: JSON.stringify({ totalVnd }) }), params({ id: orderId }))

  it("Sale báo giá đơn dưới sàn → 422 BELOW_FLOOR kèm giá sàn; bằng sàn thì được", async () => {
    const orderId = await draftOrder()
    const low = await quote(sale.token, orderId, floorVnd - 1000)
    expect(low.status).toBe(422)
    const body = (await readJson(low)).error as { details: { reason: string; floorVnd: number } }
    expect(body.details).toMatchObject({ reason: "BELOW_FLOOR", floorVnd })
    expect(Number((await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })).total_vnd)).toBe(0)

    expect((await quote(sale.token, orderId, floorVnd)).status).toBe(200)
  })

  // Audit BL-07 (06/11/2026): báo giá bị chặn nhưng tạo đơn với cùng giá thì lọt.
  it("Sale tạo đơn nhập tay dưới sàn → 422 BELOW_FLOOR; Điều hành tạo được; giá 0 (chờ báo giá) vẫn tạo được", async () => {
    const post = (token: string, unitPriceVnd: number) =>
      createOrderRoute(withSession(`${BASE}/orders`, token, { method: "POST", body: JSON.stringify({ items: [{ productId, description: "Bó hồng", quantity: 1, unitPriceVnd }] }) }))
    const low = await post(sale.token, floorVnd - 1000)
    expect(low.status).toBe(422)
    expect(((await readJson(low)).error as { details: { reason: string } }).details.reason).toBe("BELOW_FLOOR")
    expect((await post(sale.token, floorVnd)).status).toBe(201)
    expect((await post(sale.token, 0)).status).toBe(201)
    expect((await post(a.token, floorVnd - 1000)).status).toBe(201)
  })

  // PO 07/11/2026 (Q3): mã C9 "vượt trần" chặn thật — Sale bị chặn, người có C9 (Điều hành, Điều phối) đặt được.
  it("vượt trần: Sale báo giá / tạo đơn → 422 ABOVE_CEILING; bằng trần được; Điều hành vượt được", async () => {
    const orderId = await draftOrder()
    const high = await quote(sale.token, orderId, ceilingVnd + 1000)
    expect(high.status).toBe(422)
    expect(((await readJson(high)).error as { details: { reason: string; ceilingVnd: number } }).details).toMatchObject({ reason: "ABOVE_CEILING", ceilingVnd })
    expect((await quote(sale.token, orderId, ceilingVnd)).status).toBe(200)

    const post = (token: string, unitPriceVnd: number) =>
      createOrderRoute(withSession(`${BASE}/orders`, token, { method: "POST", body: JSON.stringify({ items: [{ productId, description: "Bó hồng", quantity: 1, unitPriceVnd }] }) }))
    expect((await post(sale.token, ceilingVnd + 1000)).status).toBe(422)
    expect((await post(a.token, ceilingVnd + 1000)).status).toBe(201)
  })

  it("Điều hành (C10) báo giá dưới sàn được — chính thao tác đó là phê duyệt", async () => {
    const orderId = await draftOrder()
    expect((await quote(a.token, orderId, floorVnd - 1000)).status).toBe(200)
  })

  it("mẫu chưa gắn độ phức tạp (thiếu tiền công): sàn tính từ phần giá vốn đã có, Sale dưới mức đó bị chặn kèm lời nhắc; trần không áp (PO 11/11/2026)", async () => {
    await prisma.products.update({ where: { id: productId }, data: { attributes: { price: 500000 } as never } })
    const cost = await readJson(await getCost(withSession(`${BASE}/costing/products/${productId}/cost`, a.token), params({ productId })))
    const partial = (cost.data as { cost: { totalVnd: number; complete: boolean } }).cost
    expect(partial.complete).toBe(false)
    const partialFloor = Math.ceil(partial.totalVnd / 1000) * 1000
    expect(partialFloor).toBeGreaterThan(0)
    const orderId = await draftOrder()
    const low = await quote(sale.token, orderId, partialFloor - 1000)
    expect(low.status).toBe(422)
    const err = (await readJson(low)).error as { message: string; details: { reason: string; floorVnd: number } }
    expect(err.details).toMatchObject({ reason: "BELOW_FLOOR", floorVnd: partialFloor })
    expect(err.message).toContain("giá vốn của mẫu chưa đủ dữ liệu")
    expect((await quote(sale.token, orderId, partialFloor * 10)).status).toBe(200)
  })

  it("Sale lập báo giá bán hàng dưới sàn → 422; Điều hành lập được", async () => {
    const body = JSON.stringify({ items: [{ productId, name: "Bó hồng", qty: 2, unitPrice: floorVnd - 5000 }] })
    expect((await createQuotation(withSession(`${BASE}/quotations`, sale.token, { method: "POST", body }))).status).toBe(422)
    expect((await createQuotation(withSession(`${BASE}/quotations`, a.token, { method: "POST", body }))).status).toBe(201)
  })
})
