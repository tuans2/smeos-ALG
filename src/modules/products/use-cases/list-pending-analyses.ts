import { validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { AssetRepository, getAssetRepository } from "@/modules/assets/infra/asset-repository"
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"
import { ProductAnalysisRepository, getProductAnalysisRepository } from "@/modules/products/infra/product-analysis-repository"

const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100

/**
 * `GET /vision/analyses` (`H3`, nợ #48 — TECHNICAL_DEBT.md). Chỉ liệt kê
 * `approval_state = PENDING` — đây là hàng chờ duyệt cho màn "Duyệt", không
 * phải toàn bộ lịch sử phân tích (chưa có route liệt kê toàn bộ, ngoài
 * phạm vi nợ #48). Gác bằng `H3` (không phải `H1`) vì đây là màn của người
 * duyệt, không phải người vừa gửi phân tích.
 */
export async function listPendingAnalyses(
  ctx: TenantContext,
  options: { limit?: number | undefined; cursor?: string | null | undefined }
) {
  const limit = options.limit ?? DEFAULT_LIMIT
  if (limit < 1 || limit > MAX_LIMIT) {
    throw validationFailed({ limit: `Phải trong khoảng 1..${MAX_LIMIT}` })
  }

  const rows = await getProductAnalysisRepository().listPending(ctx, {
    limit: limit + 1,
    cursor: options.cursor ?? null,
  })
  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null

  const assetRepo = getAssetRepository()
  const storage = getStorageProvider()
  const data = await Promise.all(
    page.map(async (row) => {
      let imageUrl: string | null = null
      if (row.asset_id) {
        const asset = await assetRepo.findById(ctx, row.asset_id)
        if (asset?.storage_key) {
          imageUrl = await storage.signedUrl(asset.storage_key, 24 * 60 * 60)
        }
      }
      return {
        ...row,
        image_url: imageUrl,
      }
    })
  )

  return { data, next_cursor: nextCursor }
}
