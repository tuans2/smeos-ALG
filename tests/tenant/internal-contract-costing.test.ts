import { afterAll, beforeAll, describe, expect, it } from "vitest"

import * as R from "@/app/api/v1/_contracts/responses-costing"
import { GET as history } from "@/app/api/v1/costing/materials/[id]/history/route"
import { PATCH as patchMaterial } from "@/app/api/v1/costing/materials/[id]/route"
import { GET as listMaterials, POST as createMaterial } from "@/app/api/v1/costing/materials/route"
import { POST as purchase } from "@/app/api/v1/costing/needs/purchase/route"
import { GET as needs } from "@/app/api/v1/costing/needs/route"
import { GET as cost } from "@/app/api/v1/costing/products/[productId]/cost/route"
import { POST as applyPrice } from "@/app/api/v1/costing/products/[productId]/price/route"
import { GET as profile } from "@/app/api/v1/costing/profile/route"
import { GET as getRecipe, PUT as saveRecipe } from "@/app/api/v1/costing/recipes/[productId]/route"
import { DELETE as archiveList, GET as getList, PATCH as toggleList, PUT as putList } from "@/app/api/v1/price-lists/[id]/route"
import { GET as listLists, POST as createList } from "@/app/api/v1/price-lists/route"
import { GET as getRules, PUT as putRule } from "@/app/api/v1/pricing-rules/route"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"

/** Hợp đồng phản hồi `/costing/*`, `/pricing-rules`, `/price-lists/*` (OpenAPI nội bộ, PO 07/11/2026) trên CSDL thật. */
const BASE = "http://localhost/api/v1"
const pid = (productId: string) => ({ params: Promise.resolve({ productId }) })
const ps = (id: string) => ({ params: Promise.resolve({ id }) })

describe("hợp đồng — tính giá, quy tắc giá, bảng giá", () => {
  let t: Tenant
  let productId: string
  const get = (path: string) => withSession(`${BASE}${path}`, t.token)
  const send = (path: string, method: string, body?: unknown) =>
    withSession(`${BASE}${path}`, t.token, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })

  beforeAll(async () => {
    await resetDatabase()
    t = await createTenant("hop-dong-tinh-gia")
    const p = await prisma.products.create({
      data: {
        organization_id: t.organizationId, code: "BH-01", name: "Bó hồng đỏ", category: "Bó hoa", status: "ACTIVE",
        attributes: { price: 400000, price_vnd: 400000, craft_complexity: "MEDIUM", bom: { flowers: [{ name: "Hoa hồng", quantity: 10 }, { name: "Lá bạc", quantity: 3 }] } } as never,
      },
    })
    productId = p.id
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("hồ sơ, nguyên liệu, lịch sử giá, công thức, giá vốn, áp giá", async () => {
    await expectContract(await profile(get("/costing/profile")), 200, R.costingProfileResponse, "costing-profile")
    const rose = await expectContract(
      await createMaterial(send("/costing/materials", "POST", { name: "Hoa hồng", unit: "cành", category_key: "MAIN_FLOWER", unit_cost_vnd: 10000, supplier_name: "Vựa Đà Lạt", on_hand_qty: 5 })),
      201, R.materialResponse, "costing-material-create"
    )
    const roseId = String((rose.data as { id: string }).id)
    await expectContract(await patchMaterial(send(`/costing/materials/${roseId}`, "PATCH", { unit_cost_vnd: 14000 }), ps(roseId)), 200, R.materialResponse, "costing-material-patch")
    await expectContract(await listMaterials(get("/costing/materials?include_inactive=true")), 200, R.materialsResponse, "costing-materials")
    await expectContract(await history(get(`/costing/materials/${roseId}/history`), ps(roseId)), 200, R.materialHistoryResponse, "costing-history")

    await expectContract(await getRecipe(get(`/costing/recipes/${productId}`), pid(productId)), 200, R.recipeResponse, "costing-recipe-draft")
    await expectContract(
      await saveRecipe(send(`/costing/recipes/${productId}`, "PUT", { lines: [{ material_id: roseId, quantity: 10 }], waste_percent: 5, labor_minutes: 20, note: "Gói giấy kraft" }), pid(productId)),
      200, R.savedRecipeResponse, "costing-recipe-save"
    )
    await expectContract(await getRecipe(get(`/costing/recipes/${productId}`), pid(productId)), 200, R.recipeResponse, "costing-recipe-saved")
    await expectContract(await cost(get(`/costing/products/${productId}/cost?competitor_vnd=380000`), pid(productId)), 200, R.productCostResponse, "costing-cost")
    await expectContract(await applyPrice(send(`/costing/products/${productId}/price`, "POST", { price_vnd: 420000, scenario: "RECOMMENDED" }), pid(productId)), 200, R.applyPriceResponse, "costing-apply")
  })

  it("dự toán mua và đánh dấu đã mua; khoảng ngày sai → 400", async () => {
    await prisma.orders.create({
      data: {
        organization_id: t.organizationId, code: "DH-TG-1", status: "CONFIRMED", total_vnd: 800000, balance_vnd: 800000, created_by: t.userId,
        delivery_window: { date: "2026-11-10" },
        items: { create: [{ organization_id: t.organizationId, product_id: productId, quantity: 2, unit_price_vnd: 400000 }] },
      },
    })
    const plan = await expectContract(await needs(get("/costing/needs?from=2026-11-09&to=2026-11-11")), 200, R.needsResponse, "costing-needs")
    const first = (plan.data as { needs: { materialId: string; toBuyQty: number }[] }).needs[0]!
    await expectContract(await purchase(send("/costing/needs/purchase", "POST", { items: [{ material_id: first.materialId, quantity: first.toBuyQty, unit_cost_vnd: 13000 }] })), 200, R.purchaseResponse, "costing-purchase")
    expect((await needs(get("/costing/needs?from=2026-11-11&to=2026-11-09"))).status).toBe(400)
  })

  it("quy tắc giá: đọc, ghi; khoá lạ → 400", async () => {
    await expectContract(await putRule(send("/pricing-rules", "PUT", { key: "floor_ceiling_ratio", value: { floorRatio: 1.2, ceilingRatio: 3 } })), 200, R.pricingRulePutResponse, "pricing-rule-put")
    await expectContract(await getRules(get("/pricing-rules")), 200, R.pricingRulesResponse, "pricing-rules")
    expect((await putRule(send("/pricing-rules", "PUT", { key: "khong_co", value: 1 }))).status).toBe(400)
  })

  it("bảng giá: tạo, danh sách, xem, sửa, bật/tắt, bỏ", async () => {
    const created = await expectContract(
      await createList(send("/price-lists", "POST", { name: "Bảng giá Tết", heading: "Hoa Tết 2027", categories: ["Bó hoa"], valid_from: "2027-01-15", valid_to: "2027-02-15" })),
      201, R.priceListResponse, "price-list-create"
    )
    const id = String(created.id)
    await expectContract(await listLists(get("/price-lists")), 200, R.priceListsResponse, "price-lists")
    await expectContract(await getList(get(`/price-lists/${id}`), ps(id)), 200, R.priceListDocumentResponse, "price-list-document")
    await expectContract(await putList(send(`/price-lists/${id}`, "PUT", { name: "Bảng giá Tết (sửa)", show_peak_price: false }), ps(id)), 200, R.priceListResponse, "price-list-put")
    await expectContract(await toggleList(send(`/price-lists/${id}`, "PATCH", { active: false }), ps(id)), 200, R.priceListResponse, "price-list-toggle")
    await expectContract(await archiveList(send(`/price-lists/${id}`, "DELETE"), ps(id)), 200, R.priceListArchivedResponse, "price-list-delete")
  })
})
