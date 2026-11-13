import { randomUUID } from "node:crypto"

import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as batchImportRoute } from "@/app/api/v1/products/batch-import/route"
import type { TenantContext } from "@/core/tenancy"
import { AssetRepository } from "@/modules/assets/infra/asset-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const URL_BATCH = "http://localhost/api/v1/products/batch-import"

async function seedAsset(ctx: TenantContext): Promise<string> {
  const asset = await new AssetRepository().create(ctx, {
    id: randomUUID(),
    productId: null,
    parentAssetId: null,
    kind: "ORIGINAL",
    version: 1,
    storageKey: `org/${ctx.organizationId}/khong-san-pham/${randomUUID()}.jpg`,
    mimeType: "image/jpeg",
    createdBy: ctx.userId,
  })
  return asset.id
}

function importItems(t: Tenant, items: Array<{ code: string; image_asset_id: string | null }>) {
  return batchImportRoute(
    withSession(URL_BATCH, t.token, {
      method: "POST",
      body: JSON.stringify({ items: items.map((i) => ({ ...i, name: `Mẫu ${i.code}` })), skip_duplicates: true }),
    }),
  )
}

async function mainImages(t: Tenant, code: string) {
  const product = await prisma.products.findFirstOrThrow({ where: { organization_id: t.organizationId, code } })
  return prisma.product_images.findMany({ where: { product_id: product.id, role: "MAIN" } })
}

describe("batch-import — bù ảnh cho mã đã có", () => {
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

  it("nhập lại kèm ảnh → gắn ảnh cho sản phẩm cũ chưa có ảnh", async () => {
    await importItems(a, [{ code: "BST-Basic-BO-001", image_asset_id: null }])
    const assetId = await seedAsset(a.ctx)

    const res = await importItems(a, [{ code: "BST-Basic-BO-001", image_asset_id: assetId }])
    const body = (await readJson(res)).data as Record<string, number>
    expect(body.skipped_count).toBe(1)
    expect(body.images_attached_count).toBe(1)
    expect((await mainImages(a, "BST-Basic-BO-001")).map((i) => i.asset_id)).toEqual([assetId])
  })

  it("không thay ảnh chính sẵn có", async () => {
    const first = await seedAsset(a.ctx)
    await importItems(a, [{ code: "SP-1", image_asset_id: first }])
    const second = await seedAsset(a.ctx)

    const body = (await readJson(await importItems(a, [{ code: "SP-1", image_asset_id: second }]))).data as Record<string, number>
    expect(body.images_attached_count).toBe(0)
    expect((await mainImages(a, "SP-1")).map((i) => i.asset_id)).toEqual([first])
  })

  it("cách ly tenant: mã trùng ở tiệm khác không bị gắn ảnh", async () => {
    await importItems(a, [{ code: "SP-CHUNG", image_asset_id: null }])
    const assetB = await seedAsset(b.ctx)

    const body = await readJson(await importItems(b, [{ code: "SP-CHUNG", image_asset_id: assetB }]))
    expect((body.data as { created_count: number }).created_count).toBe(1)
    expect(await mainImages(a, "SP-CHUNG")).toHaveLength(0)
  })

  it("nhập lại: link trang web cũ được thay bằng link Drive, link Drive sẵn có giữ nguyên", async () => {
    const web = "https://siinstore.com/shop/hoa-chia-buon/ke-hoa"
    const drive = "https://drive.google.com/file/d/1XHMNgd25xRYA7T1t2yQ0siCXswGqKwtZ/view?usp=sharing"
    const send = (code: string, link: string) =>
      batchImportRoute(withSession(URL_BATCH, a.token, {
        method: "POST",
        body: JSON.stringify({ items: [{ code, name: code, attributes: { drive_link: link } }], skip_duplicates: true }),
      }))
    await send("WEB-1", web)
    await send("DRV-1", "https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWx")

    expect(((await readJson(await send("WEB-1", drive))).data as Record<string, number>).drive_links_updated_count).toBe(1)
    expect(((await readJson(await send("DRV-1", drive))).data as Record<string, number>).drive_links_updated_count).toBe(0)
    const link = async (code: string) =>
      ((await prisma.products.findFirstOrThrow({ where: { organization_id: a.organizationId, code } })).attributes as Record<string, unknown>).drive_link
    expect(await link("WEB-1")).toBe(drive)
    expect(await link("DRV-1")).toBe("https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWx")
  })

  it("nhập lại với overwrite_existing: cập nhật toàn diện thông tin, giá, BOM và ảnh", async () => {
    const asset1 = await seedAsset(a.ctx)
    const asset2 = await seedAsset(a.ctx)

    // Tạo ban đầu
    await batchImportRoute(withSession(URL_BATCH, a.token, {
      method: "POST",
      body: JSON.stringify({
        items: [{
          code: "SP-OVERWRITE",
          name: "Hoa Cũ",
          category: "Cũ",
          attributes: { price: 500000, color: "Đỏ", drive_link: "https://drive.google.com/file/d/old/view" },
          image_asset_id: asset1,
        }],
        skip_duplicates: true,
      }),
    }))

    // Nhập lại với thông tin và ảnh mới + overwrite_existing = true
    const res = await batchImportRoute(withSession(URL_BATCH, a.token, {
      method: "POST",
      body: JSON.stringify({
        items: [{
          code: "SP-OVERWRITE",
          name: "Hoa Mới Cập Nhật",
          category: "Mới",
          attributes: { price: 850000, color: "Vàng", drive_link: "https://drive.google.com/file/d/new/view" },
          image_asset_id: asset2,
        }],
        skip_duplicates: true,
        overwrite_existing: true,
      }),
    }))

    const body = (await readJson(res)).data as Record<string, number>
    expect(body.updated_count).toBe(1)

    const updatedProduct = await prisma.products.findFirstOrThrow({
      where: { organization_id: a.organizationId, code: "SP-OVERWRITE" },
    })
    expect(updatedProduct.name).toBe("Hoa Mới Cập Nhật")
    expect(updatedProduct.category).toBe("Mới")
    const attrs = updatedProduct.attributes as Record<string, unknown>
    expect(attrs.price).toBe(850000)
    expect(attrs.color).toBe("Vàng")
    expect(attrs.drive_link).toBe("https://drive.google.com/file/d/new/view")

    // Ảnh chính đã được cập nhật sang asset2
    const images = await mainImages(a, "SP-OVERWRITE")
    expect(images.map((i) => i.asset_id)).toEqual([asset2])
  })
})
