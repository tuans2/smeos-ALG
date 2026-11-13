import type { ProductPricing } from "@/modules/products/domain/product-pricing"

export interface ParsedProductRow {
  index: number
  code: string
  loviCode?: string | undefined
  siinCode?: string | undefined
  name: string
  price: number | null
  category: string
  shape: string
  facing: string
  container: string
  color: string
  description: string
  flowersText: string
  driveLink?: string | undefined
  imageFileName: string
  matchedFile: File | null
  previewUrl: string | null
  uploadedAssetId?: string | null | undefined
  status: "MATCHED" | "DRIVE_SYNC" | "NO_IMAGE" | "ERROR"
  errorMsg?: string | undefined
  /** Có cột "Kiểu giá": kiểu giá đã dựng (Khoảng giá gộp nhiều dòng cùng mã) */
  pricing?: ProductPricing | undefined
  /** Số dòng phiên bản đã gộp */
  variantCount?: number | undefined
}

export interface ImportResult {
  /** false = có lô không gửi được; các con số vẫn phản ánh phần ĐÃ lưu trước đó. */
  success: boolean
  createdCount: number
  /** Mã đã có trong hệ thống và được cập nhật thông tin/ảnh/link Drive mới. */
  updatedCount: number
  skippedCount: number
  /** Mã đã có, chưa có ảnh — lần này được bù ảnh từ thư mục tải lên. */
  imagesAttachedCount: number
  /** Mã đã có, link ảnh cũ không phải Drive — được thay bằng link Drive trong file. */
  driveLinksUpdatedCount: number
  failedCount: number
  failedItems: Array<{ code: string; error: string }>
}

export interface ImportProgress {
  current: number
  total: number
  phase: string
}

export type DriveRef = { kind: "folder" | "file"; id: string }

/**
 * Nhận diện link Drive: `.../folders/<id>` (folder) hoặc `/file/d/<id>`, `open?id=`, `uc?id=` (file).
 * Link lạ → undefined (ô ảnh báo "Link không hợp lệ" thay vì chờ mãi).
 */
export function parseDriveLink(link: string | undefined): DriveRef | undefined {
  if (!link) return undefined
  const folder = link.match(/\/folders\/([a-zA-Z0-9_-]{10,})/)?.[1]
  if (folder) return { kind: "folder", id: folder }
  const file = link.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/)?.[1] ?? link.match(/[?&]id=([a-zA-Z0-9_-]{10,})/)?.[1]
  return file ? { kind: "file", id: file } : undefined
}

/** Folder id trong link Drive dạng `.../folders/<id>`. */
export function driveFolderId(link: string | undefined): string | undefined {
  const ref = parseDriveLink(link)
  return ref?.kind === "folder" ? ref.id : undefined
}

/** Thumbnail trực tiếp của một file Drive công khai (không cần gọi server). */
export function driveFileThumbnail(fileId: string): string {
  return `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}=w400`
}
