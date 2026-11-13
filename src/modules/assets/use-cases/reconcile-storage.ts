import type { StorageProvider, StoredObject } from "@/core/ports"
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"
import { MANAGED_PREFIXES, reconcileStorage, type ReconciliationReport } from "@/modules/assets/domain/storage-reconciliation"
import { loadRegistryKeys } from "@/modules/assets/infra/storage-registry-keys"

/** Trần trang liệt kê mỗi tiền tố (1000 tệp/trang) — vòng lặp luôn có giới hạn. */
const MAX_LIST_PAGES = 1000

export type ReconcileDeps = {
  storage: Pick<StorageProvider, "list">
  loadRegistry: typeof loadRegistryKeys
}

async function listAll(storage: Pick<StorageProvider, "list">, prefix: string): Promise<StoredObject[]> {
  const all: StoredObject[] = []
  let cursor: string | null = null
  for (let page = 0; page < MAX_LIST_PAGES; page++) {
    const result = await storage.list(prefix, cursor)
    all.push(...result.items)
    if (!result.nextCursor) return all
    cursor = result.nextCursor
  }
  throw new Error(`Vượt trần ${MAX_LIST_PAGES} trang khi liệt kê ${prefix}`)
}

/** SDAGF P2 — đối soát chỉ đọc: không xoá, không sửa bản ghi. */
export async function reconcileStorageRegistry(
  deps: ReconcileDeps = { storage: getStorageProvider(), loadRegistry: loadRegistryKeys }
): Promise<ReconciliationReport> {
  const stored: StoredObject[] = []
  for (const prefix of MANAGED_PREFIXES) stored.push(...(await listAll(deps.storage, prefix)))
  const { registry, pendingDeletes } = await deps.loadRegistry()
  return reconcileStorage({ stored, registryKeys: registry, pendingDeletes })
}
