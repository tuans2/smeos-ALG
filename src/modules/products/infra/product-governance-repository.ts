import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"
import type { DbClient } from "./db-client"
import type { InputJsonValue, product_change_requests, product_import_batches, product_revisions, products } from "./entities"

/** Nội dung mẫu lưu trong `product_revisions.snapshot` — đủ để khôi phục. */
export type ProductSnapshot = Pick<products, "name" | "code" | "category" | "shape" | "facing" | "container" | "status" | "attributes" | "availability_config"> &
  Partial<Pick<products, "barcode" | "cost_price_vnd" | "vat_percent" | "weight_grams" | "tags">>

export function snapshotOf(p: products): ProductSnapshot {
  return {
    name: p.name,
    code: p.code,
    category: p.category,
    shape: p.shape,
    facing: p.facing,
    container: p.container,
    status: p.status,
    attributes: p.attributes,
    availability_config: p.availability_config,
    barcode: p.barcode,
    cost_price_vnd: p.cost_price_vnd,
    vat_percent: p.vat_percent,
    weight_grams: p.weight_grams,
    tags: p.tags,
  }
}

/**
 * Ba bảng quản trị danh mục (giai đoạn 3): đề xuất sửa, phiên bản, lô nhập
 * Excel. Mọi truy vấn qua `scopedWhere`/`scopedData` — bản ghi tổ chức khác
 * không bao giờ đọc/ghi được (trả `null` → use-case ném 404).
 */
export class ProductGovernanceRepository {
  constructor(private readonly db: DbClient = prisma) {}

  // ── Phiên bản ────────────────────────────────────────────────────────────
  addRevision(
    ctx: TenantContext,
    input: { productId: string; snapshot: ProductSnapshot; reason: "EDIT" | "CHANGE_REQUEST" | "IMPORT" | "RESTORE"; importBatchId?: string | null | undefined }
  ): Promise<product_revisions> {
    return this.db.product_revisions.create({
      data: scopedData(ctx, {
        product_id: input.productId,
        snapshot: input.snapshot as unknown as InputJsonValue,
        reason: input.reason,
        actor_id: ctx.userId,
        import_batch_id: input.importBatchId ?? null,
      }),
    })
  }

  listRevisions(ctx: TenantContext, productId: string, limit = 50): Promise<product_revisions[]> {
    return this.db.product_revisions.findMany({
      where: scopedWhere(ctx, { product_id: productId }),
      orderBy: { created_at: "desc" },
      take: limit,
    })
  }

  findRevision(ctx: TenantContext, id: string): Promise<product_revisions | null> {
    return this.db.product_revisions.findFirst({ where: scopedWhere(ctx, { id }) })
  }

  /** Phiên bản ĐẦU TIÊN của mẫu trong một lô nhập = nội dung trước khi lô ghi đè. */
  firstRevisionInBatch(ctx: TenantContext, productId: string, batchId: string): Promise<product_revisions | null> {
    return this.db.product_revisions.findFirst({
      where: scopedWhere(ctx, { product_id: productId, import_batch_id: batchId }),
      orderBy: { created_at: "asc" },
    })
  }

  // ── Đề xuất sửa ──────────────────────────────────────────────────────────
  createChangeRequest(
    ctx: TenantContext,
    input: { productId: string; changes: Record<string, unknown>; baseUpdatedAt: Date; expiresAt: Date }
  ): Promise<product_change_requests> {
    return this.db.product_change_requests.create({
      data: scopedData(ctx, {
        product_id: input.productId,
        proposed_by: ctx.userId,
        changes: input.changes as InputJsonValue,
        base_updated_at: input.baseUpdatedAt,
        expires_at: input.expiresAt,
      }),
    })
  }

  findChangeRequest(ctx: TenantContext, id: string): Promise<product_change_requests | null> {
    return this.db.product_change_requests.findFirst({ where: scopedWhere(ctx, { id }) })
  }

  listChangeRequests(
    ctx: TenantContext,
    filter: { productId?: string | undefined; status?: string | undefined },
    limit = 100
  ): Promise<Array<product_change_requests & { product: { name: string; code: string } }>> {
    return this.db.product_change_requests.findMany({
      where: scopedWhere(ctx, {
        ...(filter.productId ? { product_id: filter.productId } : {}),
        ...(filter.status ? { status: filter.status } : {}),
      }),
      orderBy: { created_at: "desc" },
      take: limit,
      include: { product: { select: { name: true, code: true } } },
    })
  }

  /** Đóng một đề xuất đang chờ. Trả `false` khi đề xuất đã được xử lý ở nơi khác (đua). */
  async closeChangeRequest(
    ctx: TenantContext,
    id: string,
    input: { status: "APPROVED" | "PARTIAL" | "REJECTED" | "EXPIRED"; appliedFields?: string[] | null; note?: string | null }
  ): Promise<boolean> {
    const result = await this.db.product_change_requests.updateMany({
      where: scopedWhere(ctx, { id, status: "PENDING" }),
      data: {
        status: input.status,
        reviewed_by: ctx.userId,
        reviewed_at: new Date(),
        ...(input.appliedFields ? { applied_fields: input.appliedFields as InputJsonValue } : {}),
        ...(input.note ? { note: input.note } : {}),
      },
    })
    return result.count > 0
  }

  /** Đề xuất sửa quá hạn — tác vụ quét đọc XUYÊN tổ chức (cron có CRON_SECRET). */
  listExpiredChangeRequests(now: Date, limit: number): Promise<product_change_requests[]> {
    return this.db.product_change_requests.findMany({
      where: { status: "PENDING", expires_at: { lte: now } },
      orderBy: { expires_at: "asc" },
      take: limit,
    })
  }

  // ── Lô nhập Excel ────────────────────────────────────────────────────────
  createImportBatch(ctx: TenantContext): Promise<product_import_batches> {
    return this.db.product_import_batches.create({
      data: scopedData(ctx, { created_by: ctx.userId, created_ids: [], updated_ids: [] }),
    })
  }

  finishImportBatch(ctx: TenantContext, id: string, createdIds: string[], updatedIds: string[]) {
    return this.db.product_import_batches.updateMany({
      where: scopedWhere(ctx, { id }),
      data: { created_ids: createdIds, updated_ids: updatedIds },
    })
  }

  findImportBatch(ctx: TenantContext, id: string): Promise<product_import_batches | null> {
    return this.db.product_import_batches.findFirst({ where: scopedWhere(ctx, { id }) })
  }

  listImportBatches(ctx: TenantContext, limit = 10): Promise<product_import_batches[]> {
    return this.db.product_import_batches.findMany({ where: scopedWhere(ctx, {}), orderBy: { created_at: "desc" }, take: limit })
  }

  /** Đánh dấu đã hoàn tác; `false` nếu lô đã được hoàn tác trước đó (bấm hai lần). */
  async markImportBatchUndone(ctx: TenantContext, id: string): Promise<boolean> {
    const result = await this.db.product_import_batches.updateMany({
      where: scopedWhere(ctx, { id, undone_at: null }),
      data: { undone_at: new Date(), undone_by: ctx.userId },
    })
    return result.count > 0
  }
}
