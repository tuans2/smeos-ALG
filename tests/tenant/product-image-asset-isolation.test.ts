import { randomUUID } from "node:crypto"

import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { PATCH as productPatch } from "@/app/api/v1/products/[id]/route"
import { POST as batchImportRoute } from "@/app/api/v1/products/batch-import/route"
import type { TenantContext } from "@/core/tenancy"
import { AssetRepository } from "@/modules/assets/infra/asset-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * `product_images.asset_id` không có khoá ngoại tới `assets`: nếu không tự chặn, cửa hàng A gắn được
 * asset của cửa hàng B làm ảnh chính rồi danh sách sản phẩm ký URL ảnh của B. Asset lạ → 404, không ghi gì.
 */
async function seedAsset(ctx: TenantContext): Promise<string> {
  const asset = await new AssetRepository().create(ctx, {
    id: randomUUID(), productId: null, parentAssetId: null, kind: "ORIGINAL", version: 1,
    storageKey: `org/${ctx.organizationId}/khong-san-pham/${randomUUID()}.jpg`, mimeType: "image/jpeg", createdBy: ctx.userId,
  })
  return asset.id
}

const mainImages = (productId: string) => prisma.product_images.findMany({ where: { product_id: productId, role: "MAIN" } })

describe("ảnh chính sản phẩm: cách ly asset giữa các cửa hàng", () => {
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

  function patch(t: Tenant, id: string, body: Record<string, unknown>) {
    return productPatch(
      withSession(`http://localhost/api/v1/products/${id}`, t.token, { method: "PATCH", body: JSON.stringify(body) }),
      { params: Promise.resolve({ id }) },
    )
  }

  it("PATCH gắn asset của cửa hàng khác → 404, sản phẩm giữ nguyên", async () => {
    const product = await new ProductRepository().create(a.ctx, { code: "SP-1", name: "Bó cũ" })
    const foreign = await seedAsset(b.ctx)

    const res = await patch(a, product.id, { name: "Bó mới", image_asset_id: foreign })
    expect(res.status).toBe(404)
    expect(await mainImages(product.id)).toHaveLength(0)
    expect((await prisma.products.findUniqueOrThrow({ where: { id: product.id } })).name).toBe("Bó cũ")
  })

  it("PATCH đổi ảnh chính → thay hẳn ảnh cũ, không để hai ảnh chính", async () => {
    const first = await seedAsset(a.ctx)
    const product = await new ProductRepository().create(a.ctx, { code: "SP-2", name: "Bó", imageAssetId: first })
    const second = await seedAsset(a.ctx)

    expect((await patch(a, product.id, { image_asset_id: second })).status).toBe(200)
    expect((await mainImages(product.id)).map((i) => i.asset_id)).toEqual([second])
  })

  it("nhập hàng loạt kèm asset của cửa hàng khác → báo lỗi dòng đó, không tạo/không ghi đè", async () => {
    const foreign = await seedAsset(b.ctx)
    const send = (overwrite: boolean) =>
      batchImportRoute(withSession("http://localhost/api/v1/products/batch-import", a.token, {
        method: "POST",
        body: JSON.stringify({
          items: [{ code: "SP-3", name: "Bó lạ", image_asset_id: foreign, attributes: { price: 999 } }],
          skip_duplicates: true, overwrite_existing: overwrite,
        }),
      }))

    const created = (await readJson(await send(false))).data as Record<string, number>
    expect(created.created_count).toBe(0)
    expect(created.failed_count).toBe(1)

    await new ProductRepository().create(a.ctx, { code: "SP-3", name: "Bó gốc", attributes: { price: 100 } })
    const overwritten = (await readJson(await send(true))).data as Record<string, number>
    expect(overwritten.failed_count).toBe(1)
    const row = await prisma.products.findFirstOrThrow({ where: { organization_id: a.organizationId, code: "SP-3" } })
    expect(row.name).toBe("Bó gốc")
    expect(await mainImages(row.id)).toHaveLength(0)
  })
})
