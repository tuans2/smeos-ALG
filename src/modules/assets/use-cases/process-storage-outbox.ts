import type { StorageProvider } from "@/core/ports"
import type { TenantContext } from "@/core/tenancy"
import { log } from "@/core/observability/log"
import { env } from "@/lib/env"
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"
import { countPayloadReferences } from "@/modules/assets/infra/payload-references"
import {
  listPendingOutbox,
  markOutboxDone,
  markOutboxFailed,
  type OutboxItem,
} from "@/modules/assets/infra/payload-outbox"

/** Số việc tối đa một lượt cron — vòng lặp luôn có giới hạn. */
const BATCH_SIZE = 100

export type OutboxDeps = {
  storage: Pick<StorageProvider, "delete">
  countReferences: (ctx: TenantContext, key: string) => Promise<number>
  listPending: (limit: number) => Promise<OutboxItem[]>
  markDone: (id: string, note: string | null, now: Date) => Promise<void>
  markFailed: (id: string, error: string) => Promise<void>
}

export type OutboxSummary = { deleted: number; keptReferenced: number; failed: number }

/** Tắt mặc định cho tới khi kho R2 có bản sao (SDAGF D-06, roadmap P1-4):
 *  xoá nhầm payload khi chưa có backup là không khôi phục được. Hàng đợi vẫn
 *  được ghi, bật cờ là cron xử lý dồn. */
function defaultDeps(): OutboxDeps | null {
  if (env.STORAGE_DELETE_PAYLOADS !== "enabled") return null
  return {
    storage: getStorageProvider(),
    countReferences: countPayloadReferences,
    listPending: listPendingOutbox,
    markDone: markOutboxDone,
    markFailed: markOutboxFailed,
  }
}

function systemContext(organizationId: string): TenantContext {
  return { organizationId, workspaceId: organizationId, userId: "cron:storage-outbox", branchId: null, capabilities: new Set() }
}

/**
 * Xoá payload trong hàng đợi. Khoá còn bản ghi khác trỏ tới (Master dùng
 * chung tệp gốc — `promote-to-master.ts`) thì đóng việc, không xoá tệp.
 * Trả `null` khi cờ `STORAGE_DELETE_PAYLOADS` chưa bật.
 */
export async function processStorageOutbox(
  now: Date = new Date(),
  deps: OutboxDeps | null = defaultDeps()
): Promise<OutboxSummary | null> {
  if (!deps) return null
  const summary: OutboxSummary = { deleted: 0, keptReferenced: 0, failed: 0 }
  for (const item of await deps.listPending(BATCH_SIZE)) {
    try {
      if ((await deps.countReferences(systemContext(item.organization_id), item.storage_key)) > 0) {
        await deps.markDone(item.id, "still_referenced", now)
        summary.keptReferenced += 1
        continue
      }
      await deps.storage.delete(item.storage_key)
      await deps.markDone(item.id, null, now)
      summary.deleted += 1
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      await deps.markFailed(item.id, message)
      summary.failed += 1
      log.warn("storage.outbox_delete_failed", { organizationId: item.organization_id, outboxId: item.id, error: message })
    }
  }
  return summary
}
