import { notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import type { IAssetRepository } from "@/modules/assets/domain/repositories/asset-repository.interface"
import { getAssetRepository } from "@/modules/assets/infra/asset-repository"
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"

/**
 * Hạn của URL ký sẵn — đủ cho một phiên làm việc dài trên Creative Studio
 * (nhiều tab, có thể để mở qua giờ nghỉ), ngắn hơn đáng kể so với hạn dùng
 * lại được cấp phép của asset (asset không đổi, URL ký hết hạn thì gọi lại
 * endpoint này để ký mới — không lưu URL đã ký vào đâu cả, luôn ký tại thời
 * điểm đọc). Cùng chủ đích với `MASTER_IMAGE_URL_TTL_SECONDS` ở
 * `modules/integration/use-cases/get-master-image.ts`, chỉ khác thời lượng
 * vì đây phục vụ người dùng thật đang xem màn hình, không phải engine ngoài.
 */
export const ASSET_VIEW_URL_TTL_SECONDS = 3600

export interface AssetViewUrl {
  readonly assetId: string
  readonly url: string
  readonly expiresInSeconds: number
}

/** `GET /assets/:id/view-url` (`G1`) — dùng ở nơi cần hiển thị ảnh gốc bằng
 *  `assetId` thay vì tự mang URL/Data URL qua nhiều màn hình. */
export async function getAssetViewUrl(
  ctx: TenantContext,
  id: string,
  repo: IAssetRepository = getAssetRepository()
): Promise<AssetViewUrl> {
  const asset = await repo.findById(ctx, id)
  if (!asset) throw notFound()

  const url = await getStorageProvider().signedUrl(asset.storage_key, ASSET_VIEW_URL_TTL_SECONDS, "GET")
  return { assetId: asset.id, url, expiresInSeconds: ASSET_VIEW_URL_TTL_SECONDS }
}
