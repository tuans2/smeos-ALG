import { hasCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy"
import { resolveEffectiveProductCopy, type ProductCopyEdited, type ProductCopyRaw } from "../domain/product-copy-rules"
import { toSellingNote } from "../domain/selling-note"
import type { IProductCopyRepository } from "../domain/repositories/product-copy-repository.interface"
import { getProductCopyRepository } from "../infra/product-copy-repository"

const MAX_PRODUCTS = 6

/**
 * Ghi chú bán hàng (bản ĐÃ DUYỆT mới nhất) cho các sản phẩm, để content engine viết Landing/Catalog.
 * Đọc dữ liệu bán hàng cần H5 (như `getProductCopy`); người không có H5 → trả rỗng, không báo lỗi,
 * nội dung vẫn sinh như trước. Đọc qua repository có `scopedWhere` nên chỉ thấy dữ liệu của tenant hiện tại.
 */
export async function getApprovedSellingNotes(
  ctx: TenantContext,
  productIds: readonly string[],
  repo: IProductCopyRepository = getProductCopyRepository()
): Promise<Map<string, string>> {
  const notes = new Map<string, string>()
  if (!hasCapability(ctx, "H5")) return notes
  const ids = [...new Set(productIds)].slice(0, MAX_PRODUCTS)
  await Promise.all(
    ids.map(async (id) => {
      const copies = await repo.listByProduct(ctx, id)
      const approved = copies.find((c) => c.approval_state === "APPROVED")
      if (!approved) return
      const note = toSellingNote(
        resolveEffectiveProductCopy(approved.raw as ProductCopyRaw, approved.edited as ProductCopyEdited | null)
      )
      if (note) notes.set(id, note)
    })
  )
  return notes
}
