import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"
import { getAuditLogRepository } from "@/modules/audit/infra/audit-log-repository"

import type { DbClient } from "./db-client"
import type { voucher_batches } from "./entities"
import type { VoucherBatchInput } from "../domain/voucher-batch"
import type {
  IVoucherBatchRepository,
  VoucherBatchSummary,
  VoucherCodeRow,
} from "../domain/repositories/voucher-batch-repository.interface"

type BatchStats = { codeCount: number; exhaustedCount: number; usedTotal: number; sampleCode: string | null }
const EMPTY_STATS: BatchStats = { codeCount: 0, exhaustedCount: 0, usedTotal: 0, sampleCode: null }

function toSummary(b: voucher_batches, stats: BatchStats): VoucherBatchSummary {
  return {
    id: b.id,
    name: b.name,
    promotionId: b.promotion_id,
    codePrefix: b.code_prefix,
    discountType: b.discount_type,
    discountValue: Number(b.discount_value),
    minOrderVnd: Number(b.min_order_vnd),
    maxDiscountVnd: b.max_discount_vnd === null ? null : Number(b.max_discount_vnd),
    startsAt: b.starts_at,
    expiresAt: b.expires_at,
    usageLimit: b.usage_limit,
    perCustomerLimit: b.per_customer_limit,
    isActive: b.is_active,
    createdAt: b.created_at,
    ...stats,
  }
}

/**
 * `voucher_batches` + các `vouchers` của đợt. Mã cũ (không thuộc đợt nào) vẫn do luồng
 * Thẻ chào/Catalog đọc như trước; repository này chỉ quản lý mã có `batch_id`.
 */
export class VoucherBatchRepository implements IVoucherBatchRepository {
  constructor(private readonly db: DbClient = prisma) {}

  async existingCodes(ctx: TenantContext, codes: readonly string[]): Promise<Set<string>> {
    if (codes.length === 0) return new Set()
    const rows = await this.db.vouchers.findMany({
      where: scopedWhere(ctx, { code: { in: [...codes], mode: "insensitive" as const } }),
      select: { code: true },
    })
    return new Set(rows.map((r) => r.code.toUpperCase()))
  }

  async createBatch(ctx: TenantContext, input: VoucherBatchInput, codes: readonly string[]): Promise<VoucherBatchSummary> {
    const run = async (tx: DbClient) => {
      const batch = await tx.voucher_batches.create({
        data: scopedData(ctx, {
          name: input.name.trim(),
          promotion_id: input.promotionId,
          code_prefix: input.mode === "UNIQUE" ? input.codePrefix : null,
          quantity: codes.length,
          discount_type: input.discountType,
          discount_value: input.discountValue,
          min_order_vnd: input.minOrderVnd,
          max_discount_vnd: input.maxDiscountVnd,
          starts_at: input.startsAt,
          expires_at: input.expiresAt,
          usage_limit: input.usageLimit,
          per_customer_limit: input.perCustomerLimit,
          created_by: ctx.userId,
        }),
      })
      await tx.vouchers.createMany({
        data: codes.map((code) => scopedData(ctx, {
          code,
          batch_id: batch.id,
          promotion_id: input.promotionId,
          discount_type: input.discountType,
          discount_value: input.discountValue,
          min_order_vnd: input.minOrderVnd,
          max_discount_vnd: input.maxDiscountVnd,
          starts_at: input.startsAt,
          expires_at: input.expiresAt,
          usage_limit: input.usageLimit,
          per_customer_limit: input.perCustomerLimit,
        })),
      })
      await getAuditLogRepository(tx).record(ctx, {
        action: "voucher_batch.create",
        entityType: "voucher_batches",
        entityId: batch.id,
        after: { name: batch.name, quantity: codes.length, discountType: input.discountType, discountValue: input.discountValue, promotionId: input.promotionId },
      })
      return toSummary(batch, { codeCount: codes.length, exhaustedCount: 0, usedTotal: 0, sampleCode: codes.length === 1 ? codes[0]! : null })
    }
    return "$transaction" in this.db ? this.db.$transaction(run) : run(this.db)
  }

  async listBatches(ctx: TenantContext): Promise<VoucherBatchSummary[]> {
    const batches = await this.db.voucher_batches.findMany({
      where: scopedWhere(ctx),
      orderBy: [{ created_at: "desc" }],
      take: 200,
    })
    const stats = await this.statsFor(ctx, batches.map((b) => b.id))
    return batches.map((b) => toSummary(b, stats.get(b.id) ?? EMPTY_STATS))
  }

  async findBatch(ctx: TenantContext, id: string): Promise<VoucherBatchSummary | null> {
    const batch = await this.db.voucher_batches.findFirst({ where: scopedWhere(ctx, { id }) })
    if (!batch) return null
    return toSummary(batch, (await this.statsFor(ctx, [batch.id])).get(batch.id) ?? EMPTY_STATS)
  }

  async listCodes(ctx: TenantContext, batchId: string, limit: number): Promise<VoucherCodeRow[]> {
    const rows = await this.db.vouchers.findMany({
      where: scopedWhere(ctx, { batch_id: batchId }),
      orderBy: [{ code: "asc" }],
      take: limit,
      select: { code: true, used_count: true, usage_limit: true, is_active: true, used_at: true },
    })
    return rows.map((r) => ({ code: r.code, usedCount: r.used_count, usageLimit: r.usage_limit, isActive: r.is_active, lastUsedAt: r.used_at }))
  }

  async setBatchActive(ctx: TenantContext, id: string, active: boolean): Promise<boolean> {
    const run = async (tx: DbClient) => {
      const updated = await tx.voucher_batches.updateMany({ where: scopedWhere(ctx, { id }), data: { is_active: active } })
      if (updated.count === 0) return false
      await tx.vouchers.updateMany({ where: scopedWhere(ctx, { batch_id: id }), data: { is_active: active } })
      await getAuditLogRepository(tx).record(ctx, {
        action: active ? "voucher_batch.resume" : "voucher_batch.pause",
        entityType: "voucher_batches",
        entityId: id,
        after: { isActive: active },
      })
      return true
    }
    return "$transaction" in this.db ? this.db.$transaction(run) : run(this.db)
  }

  private async statsFor(ctx: TenantContext, batchIds: string[]): Promise<Map<string, BatchStats>> {
    const out = new Map<string, BatchStats>()
    if (batchIds.length === 0) return out
    const [all, exhausted, singles] = await Promise.all([
      this.db.vouchers.groupBy({
        by: ["batch_id"],
        where: scopedWhere(ctx, { batch_id: { in: batchIds } }),
        _count: { _all: true },
        _sum: { used_count: true },
      }),
      this.db.vouchers.groupBy({
        by: ["batch_id"],
        where: scopedWhere(ctx, { batch_id: { in: batchIds }, is_used: true }),
        _count: { _all: true },
      }),
      this.db.vouchers.findMany({
        where: scopedWhere(ctx, { batch_id: { in: batchIds }, batch: { quantity: 1 } }),
        select: { batch_id: true, code: true },
      }),
    ])
    for (const row of all) {
      if (!row.batch_id) continue
      out.set(row.batch_id, { codeCount: row._count._all, exhaustedCount: 0, usedTotal: row._sum.used_count ?? 0, sampleCode: null })
    }
    for (const row of exhausted) {
      const s = row.batch_id ? out.get(row.batch_id) : undefined
      if (s) s.exhaustedCount = row._count._all
    }
    for (const row of singles) {
      const s = row.batch_id ? out.get(row.batch_id) : undefined
      if (s) s.sampleCode = row.code
    }
    return out
  }
}

let defaultRepo: IVoucherBatchRepository | null = null

export function getVoucherBatchRepository(db?: DbClient): IVoucherBatchRepository {
  if (db) return new VoucherBatchRepository(db)
  if (!defaultRepo) defaultRepo = new VoucherBatchRepository()
  return defaultRepo
}
