import { notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"
import { AssetRepository, getAssetRepository } from "@/modules/assets/infra/asset-repository"
import type { assets } from "@/modules/assets/infra/entities"
import { ProductRepository, getProductRepository } from "@/modules/products/infra/product-repository"

/**
 * Hạn của URL ký sẵn trả kèm mỗi ảnh. Ngắn có chủ đích: engine ngoài tải ảnh
 * ngay khi nhận được, không lưu lại URL. Hết hạn thì gọi lại endpoint này —
 * rẻ hơn nhiều so với để một URL đọc được ảnh sản phẩm sống lâu ngoài core.
 */
export const MASTER_IMAGE_URL_TTL_SECONDS = 15 * 60

/**
 * Hình dạng an toàn để lộ ra ngoài core — không mang `prompt`/`parameters`/
 * `cost_usd`/`provider`/`model` (nội bộ vận hành, không phải dữ liệu bàn
 * giao M04a→M04b, đặc tả 08 mục 5).
 */
export type IntegrationAsset = {
  id: string
  version: number
  storage_key: string
  /**
   * URL ký sẵn tải được ảnh thật, tuyệt đối (có `origin`) vì bên đọc nằm ở
   * origin khác. Không có trường này thì `storage_key` là một chuỗi chết:
   * `/api/v1/storage/[...key]` chỉ nhận chữ ký HMAC, không nhận token tích
   * hợp lẫn cookie phiên — ranh giới bàn giao M04a→M04b (đặc tả 08 mục 5)
   * không đi qua được.
   */
  url: string
  thumb_key: string | null
  mime_type: string
  width: number | null
  height: number | null
  aspect_ratio: string | null
  created_at: Date
}

export type MasterImageResult = {
  master: IntegrationAsset
  ratios: IntegrationAsset[]
}

async function toIntegrationAsset(asset: assets, origin: string): Promise<IntegrationAsset> {
  const path = await getStorageProvider().signedUrl(
    asset.storage_key,
    MASTER_IMAGE_URL_TTL_SECONDS
  )
  return {
    id: asset.id,
    version: asset.version,
    storage_key: asset.storage_key,
    url: new URL(path, origin).toString(),
    thumb_key: asset.thumb_key,
    mime_type: asset.mime_type,
    width: asset.width,
    height: asset.height,
    aspect_ratio: asset.aspect_ratio,
    created_at: asset.created_at,
  }
}

/**
 * `GET /integration/products/:id/master-image` (đặc tả 06 mục 11, đặc tả 08
 * mục 4). Chỉ đọc — không nhánh nào ở đây tự đặt `approval_state` (nợ #30,
 * `TECHNICAL_DEBT.md`; P9/Identity Guard mới đặt).
 *
 * `NOT_FOUND` cho cả ba trường hợp — sản phẩm không tồn tại, sản phẩm không
 * `ACTIVE`, chưa có Master Image nào `APPROVED` — cùng lý do `YC-T4`: phân
 * biệt chúng là rò thông tin về sự tồn tại của bản ghi.
 */
export async function getMasterImage(
  ctx: TenantContext,
  productId: string,
  options: { origin: string },
  assets: AssetRepository = getAssetRepository() as AssetRepository
): Promise<MasterImageResult> {
  const product = await getProductRepository().findById(ctx, productId)
  if (!product || product.status !== "ACTIVE") throw notFound()

  const master = await assets.findApprovedMaster(ctx, productId)
  if (!master) throw notFound()

  const ratios = await assets.listDerivedFrom(ctx, master.id)

  return {
    master: await toIntegrationAsset(master, options.origin),
    ratios: await Promise.all(ratios.map((asset) => toIntegrationAsset(asset, options.origin))),
  }
}
