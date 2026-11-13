import type { TenantContext } from "@/core/tenancy"
import { TrackingPipelineRepository, getTrackingPipelineRepository } from "../infra/tracking-pipeline-repository"
import { orderProductId, orderProductView, type OrderProductSource, type OrderProductView } from "../domain/order-product-view"

export { orderProductView }

/** Ảnh hiện tại trong kho cho các đơn/link (một truy vấn gộp, đúng tổ chức). */
export function productImagesFor(ctx: TenantContext, sources: OrderProductSource[], repo = getTrackingPipelineRepository()) {
  return repo.productMainImages(ctx, sources.map((s) => orderProductId(s) ?? ""))
}

/** Gắn `product` (SSOT thông tin mẫu hoa) vào từng đơn — dùng cho mọi API trả đơn thô. */
export async function withOrderProduct<T extends OrderProductSource>(ctx: TenantContext, orders: T[], repo?: TrackingPipelineRepository): Promise<Array<T & { product: OrderProductView }>> {
  const images = await productImagesFor(ctx, orders, repo)
  return orders.map((o) => ({ ...o, product: orderProductView(o, images) }))
}
