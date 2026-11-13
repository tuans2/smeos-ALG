/**
 * Đối soát registry ↔ kho tệp (SDAGF-017/026). Chỉ báo cáo, không sửa.
 *
 * - `orphans`: tệp trên kho không có bản ghi nào trỏ tới và không nằm trong
 *   hàng đợi xoá — ứng viên dọn (chi phí, dữ liệu sót sau xoá).
 * - `missing`: bản ghi trỏ tới tệp không còn trên kho — ảnh/video hỏng với
 *   người dùng.
 *
 * Chỉ xét khoá thuộc các tiền tố do hệ thống quản lý; khoá khác bỏ qua.
 *
 * Thuần: không import hạ tầng.
 */
export const MANAGED_PREFIXES = ["org/", "videos/", "platform/"] as const

const STORAGE_URL_PREFIX = "/api/v1/storage/"

export type ReconciliationReport = {
  storedCount: number
  storedBytes: number
  registryCount: number
  pendingDeleteCount: number
  orphans: { key: string; size: number }[]
  orphanBytes: number
  missing: string[]
}

export function isManagedKey(key: string): boolean {
  return MANAGED_PREFIXES.some((prefix) => key.startsWith(prefix))
}

/** `video_jobs.final_video_url` lưu dạng `/api/v1/storage/<key>?…` — rút về khoá. */
export function storageKeyFromReference(reference: string): string | null {
  const clean = reference.split("?")[0]!.split("#")[0]!.trim()
  const at = clean.indexOf(STORAGE_URL_PREFIX)
  const key = at === -1 ? clean : clean.slice(at + STORAGE_URL_PREFIX.length)
  return key && isManagedKey(key) && !key.includes("..") ? key : null
}

/** Tổ chức sở hữu khoá (`org/<id>/…` hoặc `videos/<id>/…`); khoá `platform/…` → null. */
export function organizationOfKey(key: string): string | null {
  // `platform/…` (ảnh chợ đối tác) thuộc nền tảng, không thuộc tổ chức nào
  if (key.startsWith("platform/")) return null
  return isManagedKey(key) ? (key.split("/")[1] ?? null) : null
}

export function reconcileStorage(input: {
  stored: { key: string; size: number }[]
  registryKeys: ReadonlySet<string>
  pendingDeletes: ReadonlySet<string>
}): ReconciliationReport {
  const managed = input.stored.filter((o) => isManagedKey(o.key))
  const storedKeys = new Set(managed.map((o) => o.key))
  const orphans = managed.filter((o) => !input.registryKeys.has(o.key) && !input.pendingDeletes.has(o.key))
  const missing = [...input.registryKeys].filter((k) => isManagedKey(k) && !storedKeys.has(k)).sort()
  return {
    storedCount: managed.length,
    storedBytes: managed.reduce((sum, o) => sum + o.size, 0),
    registryCount: input.registryKeys.size,
    pendingDeleteCount: input.pendingDeletes.size,
    orphans,
    orphanBytes: orphans.reduce((sum, o) => sum + o.size, 0),
    missing,
  }
}
