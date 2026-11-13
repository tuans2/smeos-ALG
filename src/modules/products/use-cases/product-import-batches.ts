import { notFound, unprocessable } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { ProductGovernanceRepository, type ProductSnapshot } from "@/modules/products/infra/product-governance-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { moveToTrash } from "@/modules/storage/use-cases/manage-trash"
import { saveRevision, writeSnapshot } from "./product-revisions"

/** Hoàn tác được trong chừng này giờ kể từ lúc nhập (đặc tả quản trị danh mục mục 8). */
export const IMPORT_UNDO_WINDOW_HOURS = 24

const ids = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [])

/** Mở một lô nhập; route nhập Excel ghi `id` vào phiên bản của từng mẫu bị cập nhật. */
export function startImportBatch(ctx: TenantContext) {
  return new ProductGovernanceRepository().createImportBatch(ctx)
}

/** Lưu nội dung mẫu TRƯỚC khi lô nhập ghi đè — để hoàn tác lô. */
export async function saveRevisionBeforeImport(ctx: TenantContext, code: string, batchId: string): Promise<string | null> {
  const product = await new ProductRepository().findByCode(ctx, code)
  if (!product) return null
  await saveRevision(ctx, product, "IMPORT", batchId)
  return product.id
}

export async function finishImportBatch(ctx: TenantContext, batchId: string, createdIds: string[], updatedIds: string[]) {
  await new ProductGovernanceRepository().finishImportBatch(ctx, batchId, createdIds, updatedIds)
  await recordAuditLog(ctx, { action: "product.import", entityType: "product_import_batch", entityId: batchId, after: { created: createdIds.length, updated: updatedIds.length } })
}

export async function listImportBatches(ctx: TenantContext) {
  const rows = await new ProductGovernanceRepository().listImportBatches(ctx)
  const now = Date.now()
  return rows.map((b) => ({
    id: b.id,
    createdAt: b.created_at,
    createdCount: ids(b.created_ids).length,
    updatedCount: ids(b.updated_ids).length,
    undoneAt: b.undone_at,
    canUndo: !b.undone_at && now - b.created_at.getTime() <= IMPORT_UNDO_WINDOW_HOURS * 3_600_000,
  }))
}

/**
 * Điều hành hoàn tác một lô nhập (`H3`) trong 24 giờ: mẫu lô tạo ra vào thùng
 * rác (khôi phục được), mẫu bị cập nhật trả về nội dung trước lô. Lỗi một mẫu
 * không dừng cả lô; trả số mẫu xử lý được.
 */
export async function undoImportBatch(ctx: TenantContext, batchId: string, now: Date = new Date()) {
  const governance = new ProductGovernanceRepository()
  const batch = await governance.findImportBatch(ctx, batchId)
  if (!batch) throw notFound()
  if (batch.undone_at) throw unprocessable("Lô nhập này đã được hoàn tác")
  if (now.getTime() - batch.created_at.getTime() > IMPORT_UNDO_WINDOW_HOURS * 3_600_000) {
    throw unprocessable(`Chỉ hoàn tác được trong ${IMPORT_UNDO_WINDOW_HOURS} giờ sau khi nhập`)
  }
  if (!(await governance.markImportBatchUndone(ctx, batchId))) throw unprocessable("Lô nhập này đã được hoàn tác")

  let trashed = 0
  let restored = 0
  const failed: string[] = []
  for (const id of ids(batch.created_ids)) {
    try {
      await moveToTrash(ctx, { id, type: "PRODUCT" })
      trashed += 1
    } catch {
      failed.push(id)
    }
  }
  const products = new ProductRepository()
  for (const id of ids(batch.updated_ids)) {
    try {
      const [current, before] = await Promise.all([products.findById(ctx, id), governance.firstRevisionInBatch(ctx, id, batchId)])
      if (!current || !before) throw notFound()
      await saveRevision(ctx, current, "RESTORE")
      await writeSnapshot(ctx, current, before.snapshot as unknown as ProductSnapshot, { withStatus: true })
      restored += 1
    } catch {
      failed.push(id)
    }
  }
  await recordAuditLog(ctx, { action: "product.import.undo", entityType: "product_import_batch", entityId: batchId, after: { trashed, restored, failed } })
  return { trashed, restored, failedCount: failed.length }
}
