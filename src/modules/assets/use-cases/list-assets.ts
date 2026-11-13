import { validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import type { IAssetRepository } from "../domain/repositories/asset-repository.interface"
import { getAssetRepository } from "../infra/asset-repository"
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"
import type { IProductRepository } from "@/modules/products/domain/repositories/product-repository.interface"
import { getProductRepository } from "@/modules/products/infra/product-repository"

const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100
const PREVIEW_EXPIRES_IN = 24 * 60 * 60

/** `GET /assets` — không có ở đặc tả 06 dạng danh sách rời, nhưng `GET
 * /products/:id/images` (`G1`) đọc qua asset; hàm này phục vụ chung, lọc
 * theo `product_id` khi có. */
export async function listAssets(
  ctx: TenantContext,
  options: {
    productId?: string | undefined
    kind?: string | undefined
    approvalState?: string | undefined
    parentAssetId?: string | undefined
    limit?: number | undefined
    cursor?: string | null | undefined
  },
  assetRepo: IAssetRepository = getAssetRepository(),
  productRepo: IProductRepository = getProductRepository()
) {
  const limit = options.limit ?? DEFAULT_LIMIT
  if (limit < 1 || limit > MAX_LIMIT) {
    throw validationFailed({ limit: `Phải trong khoảng 1..${MAX_LIMIT}` })
  }

  const rows = await assetRepo.list(ctx, {
    productId: options.productId,
    kind: options.kind as import("@/modules/assets/infra/entities").asset_kind | undefined,
    approvalState: options.approvalState as import("@/modules/assets/infra/entities").approval_state | undefined,
    parentAssetId: options.parentAssetId,
    limit: limit + 1,
    cursor: options.cursor ?? null,
  })
  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null

  const storage = getStorageProvider()

  // Lấy danh sách tên sản phẩm cho các asset đã liên kết
  const productIds = Array.from(new Set(page.map((r) => r.product_id).filter((id): id is string => Boolean(id))))
  const productMap = new Map<string, string>()
  await Promise.all(
    productIds.map(async (pId) => {
      try {
        const prod = await productRepo.findById(ctx, pId)
        if (prod?.name) productMap.set(pId, prod.name)
      } catch {
        /* bỏ qua nếu không lấy được */
      }
    })
  )

  const data = await Promise.all(
    page.map(async (row) => {
      let url: string | null = null
      if (row.storage_key) {
        try {
          url = await storage.signedUrl(row.storage_key, PREVIEW_EXPIRES_IN)
        } catch {
          url = null
        }
      }

      const meta = row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>) : null
      const productName = row.product_id ? productMap.get(row.product_id) ?? null : null
      const originalFilename = (meta?.sourceFile as string) || (meta?.filename as string) || (meta?.name as string) || null

      let friendlyName = productName || originalFilename
      if (!friendlyName) {
        const parts = row.storage_key.split("/")
        const last = parts[parts.length - 1]
        if (last && !last.startsWith(row.id)) {
          friendlyName = last
        } else {
          friendlyName = `Ảnh chụp #${row.id.slice(0, 8).toUpperCase()}`
        }
      }

      return {
        ...row,
        url,
        image_url: url,
        name: friendlyName,
        product_name: productName,
      }
    })
  )

  return { data, next_cursor: nextCursor }
}
