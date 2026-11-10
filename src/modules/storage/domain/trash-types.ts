/**
 * Domain Types for Trash Bin (Thùng rác lưu trữ 30 ngày).
 * Pure TypeScript — No Prisma or external infrastructure imports.
 */

/**
 * Loại của Kho dữ liệu v2 vào thùng rác (L-4, PO 05/11/2026: 30 ngày rồi xoá
 * vĩnh viễn tất cả — kể cả thẻ chào đã có phiên khách; đơn hàng giữ lại).
 */
export const LIBRARY_TRASH_TYPES = ["VIDEO", "CONTENT", "CATALOG", "GREETING_CATALOG", "LANDING"] as const
export type LibraryTrashType = (typeof LIBRARY_TRASH_TYPES)[number]

export type TrashItemType = "RAW_ASSET" | "APPROVED_ANALYSIS" | "PRODUCT" | LibraryTrashType
export const TRASH_ITEM_TYPES = ["RAW_ASSET", "APPROVED_ANALYSIS", "PRODUCT", ...LIBRARY_TRASH_TYPES] as const

export function isLibraryTrashType(type: string): type is LibraryTrashType {
  return (LIBRARY_TRASH_TYPES as readonly string[]).includes(type)
}

/** `asset_usages.source_type` tương ứng — mục đang được dùng thì không vào thùng rác/không xoá. */
export const LIBRARY_TRASH_SOURCE: Readonly<Record<LibraryTrashType, string>> = {
  VIDEO: "video",
  CONTENT: "content",
  CATALOG: "catalog",
  GREETING_CATALOG: "greeting_catalog",
  LANDING: "landing",
}

/** Nhãn loại mục trong Thùng rác và hộp xác nhận. */
export const TRASH_TYPE_LABEL: Readonly<Record<TrashItemType, string>> = {
  RAW_ASSET: "Ảnh gốc",
  APPROVED_ANALYSIS: "Ảnh đã duyệt",
  PRODUCT: "Sản phẩm",
  VIDEO: "Video",
  CONTENT: "Nội dung",
  CATALOG: "Bộ sưu tập chung",
  GREETING_CATALOG: "Bộ sưu tập riêng",
  LANDING: "Landing page",
}

/** Chủ ngữ trong thông báo chặn xoá. */
export const LIBRARY_TRASH_SUBJECT: Readonly<Record<LibraryTrashType, string>> = {
  VIDEO: "Video",
  CONTENT: "Nội dung",
  CATALOG: "Bộ sưu tập chung",
  GREETING_CATALOG: "Bộ sưu tập riêng",
  LANDING: "Landing page",
}

export interface TrashItem {
  id: string
  type: TrashItemType
  name: string
  code?: string | null | undefined
  imageUrl?: string | null | undefined
  trashedAt: string
  trashedBy?: string | null | undefined
  expiresAt: string
  daysRemaining: number
  priceVnd?: number | null | undefined
  category?: string | null | undefined
}

export interface TrashMeta {
  trashed_at: string
  trashed_by?: string | null | undefined
  expires_at: string
}

/** Số ngày một mục nằm trong thùng rác trước khi bị dọn vĩnh viễn. */
export const TRASH_RETENTION_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

/** Hạn dọn của mục đưa vào thùng rác lúc `trashedAt`. */
export function trashExpiresAt(trashedAt: Date): Date {
  return new Date(trashedAt.getTime() + TRASH_RETENTION_DAYS * DAY_MS)
}

export function calculateDaysRemaining(expiresAtIso: string): number {
  const expiresAt = new Date(expiresAtIso).getTime()
  const now = Date.now()
  const diffMs = expiresAt - now
  return Math.max(0, Math.ceil(diffMs / DAY_MS))
}

export function createTrashMeta(userId?: string | null | undefined): TrashMeta {
  const now = new Date()
  const expiresAt = trashExpiresAt(now)
  return {
    trashed_at: now.toISOString(),
    trashed_by: userId ?? null,
    expires_at: expiresAt.toISOString(),
  }
}
