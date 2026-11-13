/**
 * Giới hạn ảnh/video điều phối tải lên cho mỗi lần chụp (thành phẩm, người nhận).
 * PO chốt 06/10/2026: ảnh 1–5, video 0–2, video tối đa 15 giây. Pure TypeScript.
 */

export const MEDIA_LIMITS = {
  imagesMin: 1,
  imagesMax: 5,
  videosMax: 2,
  videoMaxSeconds: 15,
  imageMaxBytes: 10 * 1024 * 1024,
  videoMaxBytes: 50 * 1024 * 1024,
} as const

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const
export const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const

export type MediaKind = "image" | "video"

export function mediaKindOf(mimeType: string): MediaKind | null {
  const t = mimeType.toLowerCase()
  if ((ACCEPTED_IMAGE_TYPES as readonly string[]).includes(t)) return "image"
  if ((ACCEPTED_VIDEO_TYPES as readonly string[]).includes(t)) return "video"
  return null
}

/** Lỗi tiếng Việt cho cả bộ tệp chọn, hoặc `null` nếu hợp lệ. Thời lượng video do trình duyệt đo (giây). */
export function mediaSelectionError(
  files: readonly { mimeType: string; sizeBytes?: number | null | undefined; durationSeconds?: number | null | undefined }[],
): string | null {
  let images = 0
  let videos = 0
  for (const f of files) {
    const kind = mediaKindOf(f.mimeType)
    if (!kind) return "Chỉ nhận ảnh JPG, PNG, WEBP và video MP4, MOV, WEBM"
    if (kind === "image") {
      images++
      if ((f.sizeBytes ?? 0) > MEDIA_LIMITS.imageMaxBytes) return "Mỗi ảnh tối đa 10MB"
    } else {
      videos++
      if ((f.sizeBytes ?? 0) > MEDIA_LIMITS.videoMaxBytes) return "Mỗi video tối đa 50MB"
      if ((f.durationSeconds ?? 0) > MEDIA_LIMITS.videoMaxSeconds + 0.5) return `Mỗi video tối đa ${MEDIA_LIMITS.videoMaxSeconds} giây`
    }
  }
  if (images < MEDIA_LIMITS.imagesMin) return "Cần ít nhất 1 ảnh"
  if (images > MEDIA_LIMITS.imagesMax) return `Tối đa ${MEDIA_LIMITS.imagesMax} ảnh`
  if (videos > MEDIA_LIMITS.videosMax) return `Tối đa ${MEDIA_LIMITS.videosMax} video`
  return null
}
