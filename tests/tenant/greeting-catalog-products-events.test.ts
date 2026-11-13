import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { prisma } from "@/core/tenancy/infra/prisma"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { markSendLinkCopied } from "@/modules/greeting-card/use-cases/share-links"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { uploadBrochureProductPhoto } from "@/modules/greeting-card/use-cases/update-brochure-order-status"
import { AssetRepository } from "@/modules/assets/infra/asset-repository"
import type { TenantContext } from "@/core/tenancy"

// Cách ly hai bảng con của Thẻ chào mà greeting-card.test.ts chưa chạm tới:
// greeting_catalog_products (sản phẩm gắn vào catalog) và
// greeting_journey_events (sự kiện / ghi chú nội bộ của phiên chào khách),
// và ảnh QC gắn vào đơn Thẻ chào (trang tra cứu công khai ký URL cho ảnh đó).

async function seedAsset(ctx: TenantContext): Promise<string> {
  const asset = await new AssetRepository().create(ctx, {
    id: randomUUID(),
    productId: null,
    parentAssetId: null,
    kind: "ORIGINAL",
    version: 1,
    storageKey: `org/${ctx.organizationId}/the-chao/${randomUUID()}.jpg`,
    mimeType: "image/jpeg",
    createdBy: ctx.userId,
  })
  return asset.id
}
describe("greeting_catalog_products & greeting_journey_events — cách ly tenant", () => {
  let tenantA: Tenant
  let tenantB: Tenant
  let repo: GreetingCardRepository
  let products: ProductRepository

  beforeEach(async () => {
    await resetDatabase()
    tenantA = await createTenant("alpha")
    tenantB = await createTenant("beta")
    repo = new GreetingCardRepository()
    products = new ProductRepository()
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("greeting_catalog_products: không gắn được sản phẩm của tổ chức khác vào catalog của mình", async () => {
    const productB = await products.create(tenantB.ctx, { code: "HOA-B", name: "Hoa của B" })
    const catA = await repo.createCatalog(tenantA.ctx, {
      code: "cat-a",
      name: "Catalog A",
      createdBy: tenantA.userId,
    })

    await expect(repo.addProductToCatalog(tenantA.ctx, catA.id, productB.id)).rejects.toMatchObject({ code: "NOT_FOUND" })
    const detail = await repo.getCatalogById(tenantA.ctx, catA.id)
    expect(detail?.items).toHaveLength(0)
  })

  it("greeting_catalog_products: tạo catalog kèm productIds của tổ chức khác bị từ chối (404), không tạo catalog dở dang", async () => {
    const productA = await products.create(tenantA.ctx, { code: "HOA-A", name: "Hoa của A" })
    const productB = await products.create(tenantB.ctx, { code: "HOA-B", name: "Hoa của B" })

    await expect(
      repo.createCatalog(tenantA.ctx, {
        code: "cat-a",
        name: "Catalog A",
        productIds: [productB.id, productA.id],
        createdBy: tenantA.userId,
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(await prisma.greeting_catalogs.count({ where: { organization_id: tenantA.organizationId } })).toBe(0)
  })

  it("greeting_catalog_products: không thêm/bớt được sản phẩm trong catalog của tổ chức khác", async () => {
    const productA = await products.create(tenantA.ctx, { code: "HOA-A", name: "Hoa của A" })
    const productB = await products.create(tenantB.ctx, { code: "HOA-B", name: "Hoa của B" })
    const catB = await repo.createCatalog(tenantB.ctx, {
      code: "cat-b",
      name: "Catalog B",
      productIds: [productB.id],
      createdBy: tenantB.userId,
    })

    await expect(repo.addProductToCatalog(tenantA.ctx, catB.id, productA.id)).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(repo.removeProductFromCatalog(tenantA.ctx, catB.id, productB.id)).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(await repo.getCatalogById(tenantA.ctx, catB.id)).toBeNull()

    const detailB = await repo.getCatalogById(tenantB.ctx, catB.id)
    expect(detailB?.items.map((i) => i.product_id)).toEqual([productB.id])
  })

  it("greeting_journey_events: không ghi được sự kiện vào link của tổ chức khác", async () => {
    const catB = await repo.createCatalog(tenantB.ctx, {
      code: "cat-b",
      name: "Catalog B",
      createdBy: tenantB.userId,
    })
    const linkB = await createSendLink(tenantB.ctx, { catalogId: catB.id, customerName: "Khách B" })
    const sessionB = await prisma.greeting_sessions.findFirstOrThrow({
      where: { organization_id: tenantB.organizationId, send_code: linkB.sendCode },
      select: { id: true },
    })

    await expect(markSendLinkCopied(tenantA.ctx, linkB.sendCode)).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(await prisma.greeting_journey_events.count({ where: { session_id: sessionB.id, event_type: "LINK_COPIED" } })).toBe(0)

    await markSendLinkCopied(tenantB.ctx, linkB.sendCode)
    const own = await prisma.greeting_journey_events.findMany({
      where: { session_id: sessionB.id, event_type: "LINK_COPIED" },
      select: { organization_id: true },
    })
    expect(own).toEqual([{ organization_id: tenantB.organizationId }])
  })

  it("order_qc_records: không gắn được ảnh của tổ chức khác làm ảnh thành phẩm đơn Thẻ chào", async () => {
    const productA = await products.create(tenantA.ctx, {
      code: "HOA-A",
      name: "Hoa của A",
      attributes: { price: 500000 },
    })
    const catA = await repo.createCatalog(tenantA.ctx, {
      code: "cat-a",
      name: "Catalog A",
      productIds: [productA.id],
      createdBy: tenantA.userId,
    })
    const linkA = await createSendLink(tenantA.ctx, { catalogId: catA.id, customerName: "Khách A" })
    await selectBrochureProduct(linkA.sendCode, productA.id)
    const order = await submitBrochureOrder(linkA.sendCode, {
      customerName: "Khách A",
      customerPhone: "0987654321",
      recipientName: "Người nhận A",
      recipientPhone: "0912345678",
      confirmedTerms: true, selectedPromotionId: "promo-discount-10",
      deliveryDate: new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10),
      deliveryAddress: "1 Đường A, Quận 1, TP.HCM",
    })
    const assetB = await seedAsset(tenantB.ctx)

    await expect(
      uploadBrochureProductPhoto(tenantA.ctx, order.orderId, { assetId: assetB })
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(await prisma.order_qc_records.count({ where: { order_id: order.orderId } })).toBe(0)

    const assetA = await seedAsset(tenantA.ctx)
    await uploadBrochureProductPhoto(tenantA.ctx, order.orderId, { assetId: assetA })
    expect(await prisma.order_qc_records.count({ where: { order_id: order.orderId } })).toBe(1)
  })
})
