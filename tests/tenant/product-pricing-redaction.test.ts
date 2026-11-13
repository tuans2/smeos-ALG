import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as productGet } from "@/app/api/v1/products/[id]/route"
import { GET as productList } from "@/app/api/v1/products/route"
import { newProposal } from "@/modules/products/domain/product-proposal"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { updateProduct } from "@/modules/products/use-cases/update-product"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * PO 14/10/2026: BOM (thành phần hoa) và giá sàn/trần chỉ cho người có L5 (`pricing.read`);
 * giá bán niêm yết vẫn hiện cho Sale. Người thiếu L5 sửa sản phẩm không được làm mất BOM đang lưu.
 */
const ATTRS = { price: 450_000, color: "Hồng", bom: { flowers: [{ name: "Hồng", quantity: 10 }] }, priceGuard: { floorVnd: 400_000, ceilingVnd: 600_000 } }

describe("sản phẩm: ẩn BOM và giá sàn/trần theo quyền xem giá", () => {
  let a: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("Sale (không có L5) thấy giá bán nhưng không thấy BOM/giá sàn-trần; Điều hành thấy đủ", async () => {
    const product = await new ProductRepository().create(a.ctx, { code: "SP-1", name: "Bó hồng", status: "ACTIVE", attributes: ATTRS })
    const sale = await addStaffWithSession(a, "sale", "sale")

    const detail = await readJson(await productGet(withSession(`http://localhost/api/v1/products/${product.id}`, sale.token), { params: Promise.resolve({ id: product.id }) }))
    const attrs = detail.attributes as Record<string, unknown>
    expect(attrs.price).toBe(450_000)
    expect(attrs).not.toHaveProperty("bom")
    expect(attrs).not.toHaveProperty("priceGuard")

    const list = await readJson(await productList(withSession("http://localhost/api/v1/products?status=ACTIVE", sale.token)))
    const row = (list.data as Array<{ price_vnd: number | null; attributes: Record<string, unknown> }>)[0]!
    expect(row.price_vnd).toBe(450_000)
    expect(JSON.stringify(row)).not.toContain("flowers")
    expect(JSON.stringify(row)).not.toContain("floorVnd")

    const owner = await readJson(await productGet(withSession(`http://localhost/api/v1/products/${product.id}`, a.token), { params: Promise.resolve({ id: product.id }) }))
    expect(owner.attributes).toHaveProperty("bom")
  })

  it("người có quyền sửa nhưng không có L5 lưu sản phẩm → BOM/giá sàn-trần đang lưu được giữ, không bị ghi đè", async () => {
    // Không có H3 thì chỉ sửa được mẫu đề xuất của chính mình (product-proposal.ts).
    const product = await new ProductRepository().create(a.ctx, {
      code: "SP-2",
      name: "Bó",
      attributes: { ...ATTRS, proposal: newProposal(a.ctx.userId) },
    })
    const editor = { ...a.ctx, capabilities: new Set(["L1", "L3"]) }

    await updateProduct(editor, product.id, { attributes: { price: 500_000, color: "Đỏ", bom: { flowers: [] } } })

    const stored = (await prisma.products.findUniqueOrThrow({ where: { id: product.id } })).attributes as Record<string, unknown>
    expect(stored.price).toBe(500_000)
    expect(stored.bom).toEqual(ATTRS.bom)
    expect(stored.priceGuard).toEqual(ATTRS.priceGuard)
  })
})
