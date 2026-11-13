import { AppError, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { BULK_MAX_IDS } from "../domain/product-bulk"
import { updateProduct } from "./update-product"

export { BULK_MAX_IDS }
export type BulkStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED"

/**
 * `POST /products/bulk-status`: đổi trạng thái nhiều sản phẩm. Mỗi dòng đi qua đúng
 * `updateProduct` (cùng luật mẫu chính thức, lịch sử phiên bản) — không có đường ghi riêng.
 * Dòng lỗi không chặn dòng khác; mã của cửa hàng khác báo "không tìm thấy" như 404.
 */
export async function bulkUpdateStatus(
  ctx: TenantContext,
  ids: string[],
  status: BulkStatus,
  update: typeof updateProduct = updateProduct
): Promise<{ updated: string[]; failed: Array<{ id: string; reason: string }> }> {
  const unique = [...new Set(ids)]
  if (unique.length === 0 || unique.length > BULK_MAX_IDS) {
    throw validationFailed({ ids: `Chọn từ 1 đến ${BULK_MAX_IDS} sản phẩm` })
  }
  const updated: string[] = []
  const failed: Array<{ id: string; reason: string }> = []
  for (const id of unique) {
    try {
      await update(ctx, id, { status })
      updated.push(id)
    } catch (e) {
      if (!(e instanceof AppError)) throw e
      failed.push({ id, reason: e.code === "NOT_FOUND" ? "Không tìm thấy" : e.message })
    }
  }
  return { updated, failed }
}
