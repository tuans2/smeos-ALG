import { notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { PROPOSAL_KEY } from "@/modules/products/domain/product-proposal"
import { ProductGovernanceRepository, snapshotOf, type ProductSnapshot } from "@/modules/products/infra/product-governance-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import type { products } from "@/modules/products/infra/entities"

/** Lưu phiên bản TRƯỚC khi đổi nội dung mẫu (`product_revisions`). */
export function saveRevision(
  ctx: TenantContext,
  product: products,
  reason: "EDIT" | "CHANGE_REQUEST" | "IMPORT" | "RESTORE",
  importBatchId?: string | null
) {
  return new ProductGovernanceRepository().addRevision(ctx, { productId: product.id, snapshot: snapshotOf(product), reason, importBatchId })
}

/**
 * Ghi lại nội dung một phiên bản lên mẫu. Nhãn đề xuất là trạng thái quản trị,
 * không phải nội dung — giữ giá trị hiện tại, không lấy theo phiên bản cũ.
 */
export async function writeSnapshot(ctx: TenantContext, current: products, snap: ProductSnapshot, opts: { withStatus: boolean }) {
  const currentAttrs = (current.attributes as Record<string, unknown> | null) ?? {}
  const snapAttrs = { ...((snap.attributes as Record<string, unknown> | null) ?? {}) }
  delete snapAttrs[PROPOSAL_KEY]
  const attributes = PROPOSAL_KEY in currentAttrs ? { ...snapAttrs, [PROPOSAL_KEY]: currentAttrs[PROPOSAL_KEY] } : snapAttrs
  const updated = await new ProductRepository().update(ctx, current.id, {
    name: snap.name,
    code: snap.code,
    category: snap.category,
    shape: snap.shape,
    facing: snap.facing,
    container: snap.container,
    attributes,
    availabilityConfig: snap.availability_config ?? undefined,
    // Phiên bản trước 30/10/2026 không có cột bán hàng — giữ giá trị hiện tại thay vì xoá.
    ...("tags" in snap
      ? { commerce: { barcode: snap.barcode ?? null, cost_price_vnd: snap.cost_price_vnd ?? null, vat_percent: snap.vat_percent ?? null, weight_grams: snap.weight_grams ?? null, tags: snap.tags ?? [] } }
      : {}),
    ...(opts.withStatus ? { status: snap.status } : {}),
  })
  if (!updated) throw notFound()
  return updated
}

export async function listProductRevisions(ctx: TenantContext, productId: string) {
  const product = await new ProductRepository().findById(ctx, productId)
  if (!product) throw notFound()
  const rows = await new ProductGovernanceRepository().listRevisions(ctx, productId)
  return rows.map((r) => ({ id: r.id, reason: r.reason, actorId: r.actor_id, createdAt: r.created_at, snapshot: r.snapshot }))
}

/**
 * Điều hành khôi phục mẫu về một phiên bản cũ (`H3`, kiểm ở route). Trạng thái
 * bán giữ nguyên (việc vận hành); bản hiện tại được lưu thành phiên bản mới
 * trước khi ghi, nên khôi phục cũng hoàn tác được.
 */
export async function restoreProductRevision(ctx: TenantContext, productId: string, revisionId: string) {
  const current = await new ProductRepository().findById(ctx, productId)
  if (!current) throw notFound()
  const revision = await new ProductGovernanceRepository().findRevision(ctx, revisionId)
  if (!revision || revision.product_id !== productId) throw notFound()

  await saveRevision(ctx, current, "RESTORE")
  const updated = await writeSnapshot(ctx, current, revision.snapshot as unknown as ProductSnapshot, { withStatus: false })
  await recordAuditLog(ctx, { action: "product.revision.restore", entityType: "product", entityId: productId, before: snapshotOf(current), after: { revisionId } })
  return updated
}
