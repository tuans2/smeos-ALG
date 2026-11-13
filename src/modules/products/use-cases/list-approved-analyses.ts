import { validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { AssetRepository, getAssetRepository } from "@/modules/assets/infra/asset-repository"
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"
import { ProductAnalysisRepository, getProductAnalysisRepository } from "@/modules/products/infra/product-analysis-repository"

import type { IProductAnalysisRepository } from "@/modules/products/domain/repositories/product-analysis-repository.interface"

const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100

/**
 * Liệt kê các phân tích đã duyệt (`approval_state = APPROVED`) — phục vụ M01b (Sinh dữ liệu bán hàng).
 */
export async function listApprovedAnalyses(
  ctx: TenantContext,
  options: { limit?: number | undefined; cursor?: string | null | undefined },
  repo: IProductAnalysisRepository = getProductAnalysisRepository()
) {
  const limit = options.limit ?? DEFAULT_LIMIT
  if (limit < 1 || limit > MAX_LIMIT) {
    throw validationFailed({ limit: `Phải trong khoảng 1..${MAX_LIMIT}` })
  }

  const rows = await repo.listApproved(ctx, {
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
