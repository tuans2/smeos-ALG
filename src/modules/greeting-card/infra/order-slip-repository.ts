import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedWhere, type TenantContext } from "@/core/tenancy"
import { notFound } from "@/core/http/errors"
import { GreetingCatalogRepository } from "./greeting-catalog-repository"
import { customerNoteOf, deliveryNoteOf, snapshotOf, type OrderSlipExtras } from "../domain/order-slip-extras"

/** Mã mẫu, ảnh gốc (ký mới, không dùng URL cũ đã hết hạn) và ghi chú khách của một đơn Thẻ chào. */
export class OrderSlipRepository {
  constructor(private readonly db = prisma, private readonly catalogs = new GreetingCatalogRepository()) {}

  async get(ctx: TenantContext, orderId: string): Promise<OrderSlipExtras> {
    const order = await this.db.orders.findFirst({
      where: scopedWhere(ctx, { id: orderId, source: "BROCHURE" }),
      select: { internal_note: true, delivery_address: true, items: { select: { product_id: true, metadata: true }, take: 1 } },
    })
    if (!order) throw notFound()
    const item = order.items[0]
    const snap = snapshotOf(item?.metadata)
    const product = item?.product_id
      ? await this.db.products.findFirst({
          where: scopedWhere(ctx, { id: item.product_id }),
          select: { code: true, images: { where: { role: "MAIN" }, take: 1, select: { asset_id: true } } },
        })
      : null
    const assetId = product?.images[0]?.asset_id
    const imageUrl = assetId ? (await this.catalogs.getAssetsStorageMap(ctx.organizationId, [assetId])).get(assetId) ?? null : null
    return {
      productCode: snap.code ?? product?.code ?? null,
      productImageUrl: imageUrl,
      productDriveLink: snap.driveLink,
      customerNote: customerNoteOf(order.internal_note),
      deliveryNote: deliveryNoteOf(order.delivery_address),
    }
  }
}

let _orderSlipRepositorySingleton: OrderSlipRepository | null = null
export function getOrderSlipRepository(): OrderSlipRepository {
  if (!_orderSlipRepositorySingleton) _orderSlipRepositorySingleton = new OrderSlipRepository()
  return _orderSlipRepositorySingleton
}
