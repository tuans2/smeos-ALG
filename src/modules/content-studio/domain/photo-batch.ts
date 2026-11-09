/**
 * Cách tải ảnh ở Bước 1 (PO 08/11/2026 — cả hai kiểu):
 *  - ONE_PRODUCT: một sản phẩm, một hoặc nhiều góc chụp → MỘT Thẻ sản phẩm. Bộ quét hiện tại ghi một kết quả
 *    cho mỗi ảnh, nên chỉ ảnh chính được quét; các góc còn lại gắn vào sản phẩm sau khi duyệt Thẻ sản phẩm.
 *  - MANY_PRODUCTS: mỗi ảnh là một sản phẩm → một lượt quét chung cho cả lô, mỗi ảnh ra một Thẻ sản phẩm.
 * Mọi vòng chờ đều có trần (CLAUDE.md luật 5). Thuần — không import hạ tầng.
 */

export type PhotoBatchMode = "ONE_PRODUCT" | "MANY_PRODUCTS"

/** Trần số ảnh mỗi lần tải — giữ chi phí quét và thời gian chờ trong tầm kiểm soát. */
export const MAX_PHOTOS_PER_BATCH = 10
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024
export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const

/** Hỏi trạng thái lượt quét mỗi 2 giây, tối đa 4 phút rồi dừng và cho thử lại. */
export const POLL_INTERVAL_MS = 2_000
export const MAX_POLL_ATTEMPTS = 120

export interface PhotoCandidate {
  readonly name: string
  readonly type: string
  readonly size: number
}

export interface PhotoCheck {
  readonly ok: boolean
  readonly reason: string | null
}

export function checkPhoto(p: PhotoCandidate): PhotoCheck {
  if (!(ACCEPTED_PHOTO_TYPES as readonly string[]).includes(p.type)) {
    return { ok: false, reason: `"${p.name}" không phải ảnh JPG, PNG hoặc WEBP` }
  }
  if (p.size > MAX_PHOTO_BYTES) return { ok: false, reason: `"${p.name}" lớn hơn 15 MB` }
  return { ok: true, reason: null }
}

/** Ghép ảnh mới vào danh sách đang chọn, bỏ ảnh hỏng và phần vượt trần; trả lỗi để hiện cho user. */
export function mergePhotos<T extends PhotoCandidate>(current: readonly T[], incoming: readonly T[]): { photos: T[]; errors: string[] } {
  const errors: string[] = []
  const photos = [...current]
  for (const p of incoming) {
    const check = checkPhoto(p)
    if (!check.ok) {
      errors.push(check.reason ?? "Ảnh không hợp lệ")
      continue
    }
    if (photos.length >= MAX_PHOTOS_PER_BATCH) {
      errors.push(`Mỗi lần tải tối đa ${MAX_PHOTOS_PER_BATCH} ảnh — các ảnh sau bị bỏ qua`)
      break
    }
    photos.push(p)
  }
  return { photos, errors }
}

export interface ScanPlan {
  /** Ảnh gửi đi quét (đã tải lên kho) */
  readonly scanAssetIds: readonly string[]
  /** Ảnh góc khác — gắn vào sản phẩm sau khi Thẻ sản phẩm được duyệt (chỉ ONE_PRODUCT) */
  readonly extraAssetIds: readonly string[]
}

/** Ảnh đầu tiên là ảnh chính (ONE_PRODUCT). */
export function planScan(mode: PhotoBatchMode, assetIds: readonly string[]): ScanPlan {
  if (assetIds.length === 0) return { scanAssetIds: [], extraAssetIds: [] }
  if (mode === "MANY_PRODUCTS") return { scanAssetIds: [...assetIds], extraAssetIds: [] }
  return { scanAssetIds: [assetIds[0]!], extraAssetIds: assetIds.slice(1) }
}

export type ScanJobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED"

export type PollDecision = "WAIT" | "DONE" | "FAILED" | "TIMED_OUT"

/** Quyết định sau mỗi lần hỏi trạng thái — dừng hẳn khi hết lượt, không chờ vô hạn. */
export function pollDecision(status: ScanJobStatus | null, attempt: number): PollDecision {
  if (status === "COMPLETED") return "DONE"
  if (status === "FAILED" || status === "CANCELLED") return "FAILED"
  return attempt >= MAX_POLL_ATTEMPTS ? "TIMED_OUT" : "WAIT"
}
