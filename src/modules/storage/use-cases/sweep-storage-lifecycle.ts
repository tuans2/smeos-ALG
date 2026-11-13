import type { TenantContext } from "@/core/tenancy"
import { log } from "@/core/observability/log"
import type { AssetUsage } from "@/modules/assets/domain/asset-lifecycle"
import { findAssetUsages } from "@/modules/assets/infra/asset-usage-guard"
import { deleteAssetAndEnqueuePayloads } from "@/modules/assets/infra/payload-outbox"
import { processStorageOutbox, type OutboxSummary } from "@/modules/assets/use-cases/process-storage-outbox"
import {
  findExpiredLibraryTrash,
  findExpiredTrashedAssets,
  type ExpiredLibraryItem,
  type ExpiredTrashedAsset,
} from "../infra/expired-trash-query"
import type { ILibraryTrashRepository } from "../domain/repositories/library-trash-repository.interface"
import { getLibraryTrashRepository } from "../infra/library-trash-repository"

/** Số asset tối đa xoá một lượt cron (5 phút/lần) — vòng lặp luôn có giới hạn. */
const TRASH_BATCH_SIZE = 100

export type TrashSweepDeps = {
  findExpired: (now: Date, limit: number) => Promise<ExpiredTrashedAsset[]>
  remove: (ctx: TenantContext, asset: ExpiredTrashedAsset) => Promise<boolean>
  usages: (ctx: TenantContext, assetId: string) => Promise<AssetUsage[]>
}

const defaultTrashDeps: TrashSweepDeps = {
  findExpired: findExpiredTrashedAssets,
  remove: (ctx, asset) => deleteAssetAndEnqueuePayloads(ctx, asset, "trash.auto_purge"),
  usages: findAssetUsages,
}

function systemContext(organizationId: string): TenantContext {
  return { organizationId, workspaceId: organizationId, userId: "cron:trash-sweep", branchId: null, capabilities: new Set() }
}

/**
 * Xoá vĩnh viễn asset quá hạn thùng rác (30 ngày, SDAGF D-03), bỏ qua asset
 * đang legal hold (lọc ở truy vấn) và asset đang được dùng ở nơi khác. Thay
 * cơ chế dọn "lười" lúc mở danh sách.
 */
export async function sweepExpiredTrash(now: Date, deps: TrashSweepDeps = defaultTrashDeps): Promise<number> {
  let removed = 0
  for (const asset of await deps.findExpired(now, TRASH_BATCH_SIZE)) {
    const ctx = systemContext(asset.organization_id)
    // Ảnh đang được dùng (vd. chứng từ thanh toán) vẫn ở thùng rác, không xoá (SDAGF-012)
    const inUse = await deps.usages(ctx, asset.id)
    if (inUse.length > 0) {
      log.warn("storage.trash_sweep_skipped_in_use", { organizationId: asset.organization_id, assetId: asset.id, usages: inUse.join(",") })
      continue
    }
    if (await deps.remove(ctx, asset)) removed += 1
  }
  return removed
}

/** Mỗi loại Kho dữ liệu tối đa bấy nhiêu mục một lượt cron — vòng lặp luôn có giới hạn. */
const LIBRARY_BATCH_PER_TYPE = 20

export type LibrarySweepDeps = {
  findExpired: (now: Date, perType: number) => Promise<ExpiredLibraryItem[]>
  library: Pick<ILibraryTrashRepository, "findUsages" | "permanentDelete">
}

/**
 * L-4 (PO 05/11/2026): video, nội dung, catalog, thẻ chào, landing page quá hạn
 * thùng rác bị xoá vĩnh viễn; mục đang được dùng (chiến dịch, kênh) giữ lại.
 */
export async function sweepExpiredLibraryTrash(
  now: Date,
  deps: LibrarySweepDeps = { findExpired: findExpiredLibraryTrash, library: getLibraryTrashRepository() }
): Promise<number> {
  let removed = 0
  for (const item of await deps.findExpired(now, LIBRARY_BATCH_PER_TYPE)) {
    const ctx = systemContext(item.organization_id)
    const inUse = await deps.library.findUsages(ctx, item.type, item.id)
    if (inUse.length > 0) {
      log.warn("storage.library_sweep_skipped_in_use", { organizationId: item.organization_id, itemId: item.id, type: item.type })
      continue
    }
    if ((await deps.library.permanentDelete(ctx, item.type, item.id, "trash.auto_purge")) === "deleted") removed += 1
  }
  return removed
}

export type StorageLifecycleSummary = { trashPurged: number | null; libraryPurged: number | null; outbox: OutboxSummary | null }

/** Một lượt vòng đời kho cho cron `/internal/chain-dispatch-sweep`. Lỗi chỉ ghi log. */
export async function sweepStorageLifecycle(now: Date = new Date()): Promise<StorageLifecycleSummary> {
  const trashPurged = await sweepExpiredTrash(now).catch((error: unknown) => {
    log.error("storage.trash_sweep_failed", { error: error instanceof Error ? error.message : String(error) })
    return null
  })
  const libraryPurged = await sweepExpiredLibraryTrash(now).catch((error: unknown) => {
    log.error("storage.library_sweep_failed", { error: error instanceof Error ? error.message : String(error) })
    return null
  })
  const outbox = await processStorageOutbox(now).catch((error: unknown) => {
    log.error("storage.outbox_failed", { error: error instanceof Error ? error.message : String(error) })
    return null
  })
  return { trashPurged, libraryPurged, outbox }
}
