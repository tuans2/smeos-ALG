import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedWhere, type TenantContext } from "@/core/tenancy"
import { MAX_OUTBOX_ATTEMPTS } from "@/modules/assets/domain/asset-lifecycle"
import { payloadKeysToPurge } from "@/modules/assets/domain/payload-deletion"
import { AuditLogRepository } from "@/modules/audit/infra/audit-log-repository"

const DELETE_OP = "DELETE"

/** Hành động audit của một lần xoá vĩnh viễn (SDAGF-018). */
export type AssetDeleteAction = "asset.delete" | "trash.permanent_delete" | "trash.auto_purge"

export type OutboxItem = { id: string; organization_id: string; storage_key: string; attempts: number }

/**
 * Xoá dòng `assets` và ghi hàng đợi xoá payload trong CÙNG một transaction —
 * không có cảnh dòng đã mất mà tệp không ai nhớ để xoá (SDAGF-012/017).
 * Dòng `audit_logs` ghi trong cùng transaction (SDAGF-018).
 * Trả `false` khi không thấy asset trong tổ chức của phiên.
 */
export async function deleteAssetAndEnqueuePayloads(
  ctx: TenantContext,
  asset: { id: string; storage_key: string; thumb_key: string | null },
  action: AssetDeleteAction
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const removed = await tx.assets.deleteMany({ where: scopedWhere(ctx, { id: asset.id }) })
    if (removed.count === 0) return false
    await enqueuePayloadDeletes(tx, ctx, payloadKeysToPurge(ctx.organizationId, asset), asset.id)
    await new AuditLogRepository(tx).record(ctx, {
      action,
      entityType: "asset",
      entityId: asset.id,
      before: { storage_key: asset.storage_key, thumb_key: asset.thumb_key },
    })
    return true
  })
}

/** Ghi hàng đợi xoá payload cho các khoá đã lọc — gọi TRONG transaction xoá bản ghi. */
export async function enqueuePayloadDeletes(
  tx: Prisma.TransactionClient,
  ctx: TenantContext,
  keys: readonly string[],
  sourceId: string | null
): Promise<void> {
  for (const key of keys) {
    await tx.storage_outbox.upsert({
      where: { op_storage_key: { op: DELETE_OP, storage_key: key } },
      create: { organization_id: ctx.organizationId, op: DELETE_OP, storage_key: key, asset_id: sourceId },
      update: { done_at: null, attempts: 0, last_error: null },
    })
  }
}

/** Việc chờ xử lý của mọi tổ chức — chỉ cron hệ thống gọi. */
export function listPendingOutbox(limit: number): Promise<OutboxItem[]> {
  return prisma.storage_outbox.findMany({
    where: {
      op: DELETE_OP,
      done_at: null,
      attempts: { lt: MAX_OUTBOX_ATTEMPTS },
      // Tổ chức đang legal hold: giữ nguyên tệp, việc chờ tới khi gỡ giữ (D-04).
      organization: { OR: [{ legal_hold_until: null }, { legal_hold_until: { lte: new Date() } }] },
    },
    orderBy: { created_at: "asc" },
    take: limit,
    select: { id: true, organization_id: true, storage_key: true, attempts: true },
  })
}

export async function markOutboxDone(id: string, note: string | null, now: Date): Promise<void> {
  await prisma.storage_outbox.update({ where: { id }, data: { done_at: now, last_error: note } })
}

export async function markOutboxFailed(id: string, error: string): Promise<void> {
  await prisma.storage_outbox.update({
    where: { id },
    data: { attempts: { increment: 1 }, last_error: error.slice(0, 500) },
  })
}
