import { prisma } from "@/core/tenancy/infra/prisma"

type Db = typeof prisma

/**
 * Tra ảnh mẫu / ảnh thành phẩm của đơn cho bước gia công và AI kiểm định — mọi truy vấn lọc
 * theo tổ chức của đơn.
 */
export class OrderPhotoRepository {
  constructor(private readonly db: Db = prisma) {}

  async findAsset(organizationId: string, assetId: string) {
    return this.db.assets.findFirst({
      where: { id: assetId, organization_id: organizationId },
      select: { storage_key: true, mime_type: true },
    })
  }

  /** Sản phẩm theo id, hoặc theo tên (không phân biệt hoa thường) khi đơn không giữ id. */
  async findProductImages(organizationId: string, productId: string | null, productName: string | null) {
    if (!productId && !productName) return null
    return this.db.products.findFirst({
      where: productId
        ? { id: productId, organization_id: organizationId }
        : { organization_id: organizationId, name: { equals: productName!, mode: "insensitive" } },
      select: {
        attributes: true,
        images: { orderBy: { position: "asc" }, take: 10, select: { asset_id: true, role: true } },
      },
    })
  }

  /** Dòng hàng đầu tiên và snapshot sản phẩm của phiên Thẻ chào — nguồn ảnh mẫu của đơn. */
  async findOrderSampleSource(organizationId: string, orderId: string) {
    return this.db.orders.findFirst({
      where: { id: orderId, organization_id: organizationId },
      select: {
        items: { select: { description: true, metadata: true }, take: 1 },
        greeting_sessions: { select: { product_snapshot: true }, take: 1 },
      },
    })
  }
}
