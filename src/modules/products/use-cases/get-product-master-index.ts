/**
 * Use-case: Get Product Master Index (Trích xuất đầy đủ hồ sơ sản phẩm ngành hoa).
 * Clean Architecture: Domain/Use-case KHÔNG import Prisma trực tiếp.
 */

import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { ProductMasterIndex } from "../domain/product-master-index"
import { ProductMasterIndexRepository, getProductMasterIndexRepository } from "../infra/product-master-index-repository"
import { ProductCopyRepository } from "@/modules/product-copies/infra/product-copy-repository"
import { activationWarnings } from "../domain/product-readiness"

export async function getProductMasterIndex(
  ctx: TenantContext,
  productId: string,
  repo: ProductMasterIndexRepository = getProductMasterIndexRepository()
): Promise<ProductMasterIndex | null> {
  return repo.getById(ctx, productId)
}

export async function listProductMasterIndex(
  ctx: TenantContext,
  limit = 50,
  repo: ProductMasterIndexRepository = getProductMasterIndexRepository()
): Promise<ProductMasterIndex[]> {
  const items = await repo.list(ctx, limit)
  const approved = await new ProductCopyRepository().approvedProductIds(ctx, items.map((i) => i.id))
  return items.map((i) => ({ ...i, hasApprovedCopy: approved.has(i.id) }))
}

/**
 * Cảnh báo khi mở bán (checklist ALG 7.3, PO 05/11/2026: chỉ cảnh báo, không chặn) — với mỗi sản phẩm vừa
 * chuyển sang Đang bán: các tiêu chí còn thiếu (ảnh, danh mục, giá/công thức, bài viết đã duyệt).
 */
export async function activationWarningsFor(
  ctx: TenantContext,
  productIds: string[],
  repo: ProductMasterIndexRepository = getProductMasterIndexRepository()
): Promise<Array<{ id: string; code: string; missing: string[] }>> {
  if (productIds.length === 0) return []
  const approved = await new ProductCopyRepository().approvedProductIds(ctx, productIds)
  const out: Array<{ id: string; code: string; missing: string[] }> = []
  for (const id of productIds) {
    const mi = await repo.getById(ctx, id)
    if (!mi) continue
    const missing = activationWarnings({ ...mi, hasApprovedCopy: approved.has(id) })
    if (missing.length > 0) out.push({ id, code: mi.code, missing })
  }
  return out
}
