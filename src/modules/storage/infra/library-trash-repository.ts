import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedWhere, type TenantContext } from "@/core/tenancy"
import { isUnderLegalHold, type AssetUsage } from "@/modules/assets/domain/asset-lifecycle"
import { videoPayloadKeysToPurge } from "@/modules/assets/domain/payload-deletion"
import { storageKeyFromReference } from "@/modules/assets/domain/storage-reconciliation"
import { organizationLegalHoldUntil } from "@/modules/assets/infra/legal-hold"
import { enqueuePayloadDeletes } from "@/modules/assets/infra/payload-outbox"
import { AuditLogRepository } from "@/modules/audit/infra/audit-log-repository"
import {
  calculateDaysRemaining,
  LIBRARY_TRASH_SOURCE,
  trashExpiresAt,
  type LibraryTrashType,
  type TrashItem,
} from "../domain/trash-types"
import type { ILibraryTrashRepository, LibraryDeleteAction } from "../domain/repositories/library-trash-repository.interface"
import type { TrashDeleteResult } from "../domain/repositories/trash-repository.interface"

/** Đánh dấu catalog bị thu hồi DO thùng rác — khôi phục chỉ mở lại link mang dấu này. */
const TRASH_REVOKER = "trash"

const ENTITY: Readonly<Record<LibraryTrashType, string>> = {
  VIDEO: "video_job",
  CONTENT: "content_generation",
  CATALOG: "catalog_link",
  GREETING_CATALOG: "greeting_catalog",
  LANDING: "landing_page",
}

type Row = { id: string; name: string; trashed_at: Date | null; purge_after: Date | null }

/**
 * Thùng rác của Kho dữ liệu v2 cho 5 loại (L-4, PO 05/11/2026). Vào thùng rác:
 * ẩn khỏi công cụ và trang công khai (catalog thu hồi link, thẻ chào ẩn); quá
 * 30 ngày cron xoá vĩnh viễn. Thẻ chào xoá kéo theo phiên khách (cascade);
 * đơn hàng giữ lại (`orders.source_session_id` → null).
 */
export class LibraryTrashRepository implements ILibraryTrashRepository {
  async list(ctx: TenantContext, now: Date): Promise<TrashItem[]> {
    const trashed = <T>(where: T) => scopedWhere(ctx, { ...where, trashed_at: { not: null }, purge_after: { gt: now } })
    const pick = { trashed_at: true, purge_after: true, id: true } as const
    const [videos, contents, catalogs, greetings, landings] = await Promise.all([
      prisma.video_jobs.findMany({ where: trashed({}), select: { ...pick, title: true } }),
      prisma.content_generations.findMany({ where: trashed({}), select: { ...pick, channels: true } }),
      prisma.catalog_links.findMany({ where: trashed({}), select: { ...pick, name: true } }),
      prisma.greeting_catalogs.findMany({ where: trashed({}), select: { ...pick, name: true } }),
      prisma.landing_pages.findMany({ where: trashed({}), select: { ...pick, title: true } }),
    ])
    const item = (type: LibraryTrashType, r: Row): TrashItem => ({
      id: r.id,
      type,
      name: r.name,
      trashedAt: r.trashed_at!.toISOString(),
      expiresAt: r.purge_after!.toISOString(),
      daysRemaining: calculateDaysRemaining(r.purge_after!.toISOString()),
    })
    const channels = (c: unknown) => (Array.isArray(c) ? c.filter((x) => typeof x === "string").join(", ") : "")
    return [
      ...videos.map((r) => item("VIDEO", { ...r, name: r.title })),
      ...contents.map((r) => item("CONTENT", { ...r, name: channels(r.channels) || "Nội dung" })),
      ...catalogs.map((r) => item("CATALOG", r)),
      ...greetings.map((r) => item("GREETING_CATALOG", r)),
      ...landings.map((r) => item("LANDING", { ...r, name: r.title })),
    ]
  }

  async move(ctx: TenantContext, type: LibraryTrashType, id: string): Promise<boolean> {
    const now = new Date()
    const trash = { trashed_at: now, purge_after: trashExpiresAt(now) }
    const where = scopedWhere(ctx, { id, trashed_at: null })
    switch (type) {
      case "VIDEO":
        return (await prisma.video_jobs.updateMany({ where, data: trash })).count > 0
      case "CONTENT":
        return (await prisma.content_generations.updateMany({ where, data: trash })).count > 0
      case "LANDING":
        return (await prisma.landing_pages.updateMany({ where, data: trash })).count > 0
      case "GREETING_CATALOG":
        // Ẩn ngay (`is_active=false`) — mọi trang công khai đã tôn trọng cờ này
        return (await prisma.greeting_catalogs.updateMany({ where, data: { ...trash, is_active: false } })).count > 0
      case "CATALOG": {
        const link = await prisma.catalog_links.findFirst({ where, select: { is_revoked: true } })
        if (!link) return false
        const revoke = link.is_revoked ? {} : { is_revoked: true, revoked_at: now, revoked_by: TRASH_REVOKER }
        return (await prisma.catalog_links.updateMany({ where, data: { ...trash, ...revoke } })).count > 0
      }
    }
  }

  async restore(ctx: TenantContext, type: LibraryTrashType, id: string): Promise<boolean> {
    const clear = { trashed_at: null, purge_after: null }
    const where = scopedWhere(ctx, { id, trashed_at: { not: null } })
    switch (type) {
      case "VIDEO":
        return (await prisma.video_jobs.updateMany({ where, data: clear })).count > 0
      case "CONTENT":
        return (await prisma.content_generations.updateMany({ where, data: clear })).count > 0
      case "LANDING":
        return (await prisma.landing_pages.updateMany({ where, data: clear })).count > 0
      case "GREETING_CATALOG":
        // Khôi phục về trạng thái ẨN — người dùng tự bật lại, tránh vô tình đăng lại
        return (await prisma.greeting_catalogs.updateMany({ where, data: clear })).count > 0
      case "CATALOG": {
        const link = await prisma.catalog_links.findFirst({ where, select: { revoked_by: true } })
        if (!link) return false
        const unrevoke = link.revoked_by === TRASH_REVOKER ? { is_revoked: false, revoked_at: null, revoked_by: null } : {}
        return (await prisma.catalog_links.updateMany({ where, data: { ...clear, ...unrevoke } })).count > 0
      }
    }
  }

  async findUsages(ctx: TenantContext, type: LibraryTrashType, id: string): Promise<AssetUsage[]> {
    const [channel, campaign] = await Promise.all([
      prisma.asset_usages.count({
        where: scopedWhere(ctx, { source_type: LIBRARY_TRASH_SOURCE[type], source_id: id, status: { not: "ARCHIVED" as const } }),
      }),
      type === "VIDEO"
        ? prisma.campaign_packages.count({ where: scopedWhere(ctx, { OR: [{ video_job_id: id }, { video_job_ids: { has: id } }] }) })
        : Promise.resolve(0),
    ])
    return [...(channel > 0 ? (["channel_usage"] as const) : []), ...(campaign > 0 ? (["campaign"] as const) : [])]
  }

  async permanentDelete(ctx: TenantContext, type: LibraryTrashType, id: string, action: LibraryDeleteAction): Promise<TrashDeleteResult> {
    if (isUnderLegalHold({ legal_hold_until: await organizationLegalHoldUntil(ctx.organizationId) }, new Date())) return "legal_hold"
    const removed = await prisma.$transaction(async (tx) => {
      const count = await deleteRow(tx, ctx, type, id)
      if (count === 0) return false
      await new AuditLogRepository(tx).record(ctx, { action, entityType: ENTITY[type], entityId: id })
      return true
    })
    return removed ? "deleted" : "not_found"
  }
}

/** Xoá dòng; video ghi thêm hàng đợi xoá tệp (video dựng xong + bản phối âm) trong cùng transaction. */
async function deleteRow(tx: Prisma.TransactionClient, ctx: TenantContext, type: LibraryTrashType, id: string): Promise<number> {
  const where = scopedWhere(ctx, { id })
  switch (type) {
    case "VIDEO": {
      const job = await tx.video_jobs.findFirst({ where, select: { final_video_url: true, audio_storage_key: true } })
      if (!job) return 0
      const count = (await tx.video_jobs.deleteMany({ where })).count
      const finalKey = job.final_video_url ? storageKeyFromReference(job.final_video_url) : null
      await enqueuePayloadDeletes(tx, ctx, videoPayloadKeysToPurge(ctx.organizationId, [finalKey, job.audio_storage_key]), id)
      return count
    }
    case "CONTENT":
      return (await tx.content_generations.deleteMany({ where })).count
    case "CATALOG":
      return (await tx.catalog_links.deleteMany({ where })).count
    case "GREETING_CATALOG":
      return (await tx.greeting_catalogs.deleteMany({ where })).count
    case "LANDING":
      return (await tx.landing_pages.deleteMany({ where })).count
  }
}

let defaultRepository: ILibraryTrashRepository | null = null

export function getLibraryTrashRepository(): ILibraryTrashRepository {
  defaultRepository ??= new LibraryTrashRepository()
  return defaultRepository
}
