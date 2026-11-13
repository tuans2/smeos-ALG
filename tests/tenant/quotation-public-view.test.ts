import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { getQuotationRepository } from "@/modules/sales/infra/quotation-repository"
import { createQuotationUseCase } from "@/modules/sales/use-cases/create-quotation.use-case"
import { sendQuotationUseCase } from "@/modules/sales/use-cases/send-quotation.use-case"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/** Checklist ALG 3.11 — link báo giá có ảnh mẫu và thành phần hoa, không có giá vốn; ảnh chỉ của đúng tổ chức. */

describe("trang báo giá công khai", () => {
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

  async function productWithPhoto(t: Tenant, code: string) {
    const product = await prisma.products.create({
      data: {
        organization_id: t.organizationId, code, name: "Giỏ hồng", status: "ACTIVE", cost_price_vnd: 222_333,
        attributes: { price: 900_000, bom: { flowers: [{ name: "Hồng Ohara", quantity: 12, unit: "cành", costVnd: 15_000 }] } },
      } as never,
    })
    const asset = await prisma.assets.create({
      data: { organization_id: t.organizationId, kind: "ORIGINAL", storage_key: `org/${t.organizationId}/${product.id}/mau.png`, mime_type: "image/png", created_by: t.userId },
    })
    await prisma.product_images.create({ data: { organization_id: t.organizationId, product_id: product.id, asset_id: asset.id, role: "MAIN" } as never })
    return product
  }

  it("dòng báo giá có ảnh mẫu ký sẵn và thành phần; không lộ giá vốn hay đơn giá nguyên liệu", async () => {
    const product = await productWithPhoto(a, "SP-1")
    const quote = await createQuotationUseCase(a.ctx, { items: [{ productId: product.id, name: "Giỏ hồng", variantLabel: "Lớn", qty: 1, unitPrice: 900_000 }], shippingFee: 30_000 })
    await sendQuotationUseCase(a.ctx, quote.id)

    const view = (await getQuotationRepository().findPublicByToken(quote.publicToken))!
    expect(view.shippingFee).toBe(30_000)
    expect(view.items[0]!.variantLabel).toBe("Lớn")
    expect(view.items[0]!.composition).toContain("Hồng Ohara")
    expect(view.items[0]!.imageUrl).toMatch(/^\/api\/v1\/storage\/org\/.+\?exp=\d+&sig=/)
    const raw = JSON.stringify(view)
    expect(raw).not.toContain("222333")
    expect(raw).not.toContain("15000")
  })

  it("dòng không gắn mẫu: không ảnh, không thành phần", async () => {
    const quote = await createQuotationUseCase(b.ctx, { items: [{ name: "Hoa tự chọn", qty: 1, unitPrice: 500_000 }] })
    await sendQuotationUseCase(b.ctx, quote.id)
    const view = (await getQuotationRepository().findPublicByToken(quote.publicToken))!
    expect(view.items[0]).toMatchObject({ imageUrl: null, composition: [] })
  })
})
