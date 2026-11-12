/**
 * Domain: Media Export Presets (HA-05..10, VD-05..07)
 * Cấu hình chuẩn tỉ lệ, độ phân giải và quy tắc xuất file đa nền tảng mạng xã hội.
 * Pure logic — không import Prisma hay thư viện client.
 */

import type { PublishRatio, PublishPlatform } from "@/modules/creative-production/domain/publishing-rules"

export interface ExportPreset {
  id: string
  label: string
  platform: PublishPlatform
  platformLabel: string
  ratio: PublishRatio
  dimensions: { width: number; height: number }
  recommendedFormat: "PNG" | "JPEG" | "MP4"
  description: string
  recommendedMaxDurationSeconds?: number
}

export const EXPORT_PRESETS: readonly ExportPreset[] = [
  {
    id: "TIKTOK_VERTICAL",
    label: "TikTok / Reels / Shorts (9:16)",
    platform: "tiktok",
    platformLabel: "TikTok & Reels",
    ratio: "9:16",
    dimensions: { width: 1080, height: 1920 },
    recommendedFormat: "MP4",
    description: "Khổ dọc toàn màn hình, chuẩn xu hướng video ngắn",
    recommendedMaxDurationSeconds: 60,
  },
  {
    id: "INSTAGRAM_STORY",
    label: "Story Facebook & Instagram (9:16)",
    platform: "instagram_reels",
    platformLabel: "Story",
    ratio: "9:16",
    dimensions: { width: 1080, height: 1920 },
    recommendedFormat: "JPEG",
    description: "Ảnh tin 24h, hiển thị tràn viền trên di động",
  },
  {
    id: "FEED_SQUARE",
    label: "Vuông Bài Đăng Feed (1:1)",
    platform: "instagram_feed",
    platformLabel: "Feed Vuông",
    ratio: "1:1",
    dimensions: { width: 1080, height: 1080 },
    recommendedFormat: "JPEG",
    description: "Tỉ lệ kinh điển cho album ảnh Facebook & Instagram",
  },
  {
    id: "FEED_PORTRAIT",
    label: "Dọc Bài Đăng Feed (4:5)",
    platform: "facebook_feed",
    platformLabel: "Feed Dọc",
    ratio: "4:5",
    dimensions: { width: 1080, height: 1350 },
    recommendedFormat: "JPEG",
    description: "Chiếm diện tích hiển thị lớn nhất trên bảng tin Facebook",
  },
  {
    id: "YOUTUBE_LANDSCAPE",
    label: "Ngang Banner & YouTube (16:9)",
    platform: "youtube",
    platformLabel: "YouTube / Web",
    ratio: "16:9",
    dimensions: { width: 1920, height: 1080 },
    recommendedFormat: "MP4",
    description: "Khổ ngang chuẩn cho TV, website và YouTube HD",
    recommendedMaxDurationSeconds: 180,
  },
  {
    id: "ZALO_PRODUCT",
    label: "Zalo Shop & Zalo Feed (1:1)",
    platform: "zalo_video",
    platformLabel: "Zalo Shop",
    ratio: "1:1",
    dimensions: { width: 1080, height: 1080 },
    recommendedFormat: "PNG",
    description: "Chuẩn danh mục sản phẩm Zalo OA & gửi tin nhắn tư vấn",
  },
] as const

/**
 * Lọc preset theo định dạng ảnh hoặc video (HA-05..10, VD-05..07).
 */
export function getExportPresetsForMediaType(mediaType: "IMAGE" | "VIDEO"): ExportPreset[] {
  if (mediaType === "VIDEO") {
    return EXPORT_PRESETS.filter((p) => p.recommendedFormat === "MP4" || p.ratio === "9:16" || p.ratio === "16:9")
  }
  return EXPORT_PRESETS.filter((p) => p.recommendedFormat !== "MP4" || p.ratio === "9:16")
}

/**
 * Tạo tên file xuất chuẩn hoá chống trùng lặp và nhận diện nhanh (HA-09).
 * VD: `bo-hoa-hong-do_tiktok_9-16_1080x1920.png`
 */
export function buildExportFileName(params: {
  productTitle: string
  platform: string
  ratio: PublishRatio
  format: "png" | "jpeg" | "jpg" | "mp4"
}): string {
  const slug = params.productTitle
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "alg-asset"

  const ratioSlug = params.ratio.replace(":", "-")
  const platformSlug = params.platform.toLowerCase().replace(/[^a-z0-9]/g, "-")

  return `${slug}_${platformSlug}_${ratioSlug}.${params.format.toLowerCase()}`
}

/**
 * Kiểm tra tính hợp lệ của asset trước khi xuất sang nền tảng (VD-07).
 */
export function validateMediaExport(params: {
  targetPresetId: string
  mediaType: "IMAGE" | "VIDEO"
  durationSeconds?: number | undefined
}): { isValid: boolean; warning?: string | undefined } {
  const preset = EXPORT_PRESETS.find((p) => p.id === params.targetPresetId)
  if (!preset) {
    return { isValid: false, warning: "Không tìm thấy cấu hình preset xuất file" }
  }

  if (params.mediaType === "VIDEO") {
    if (preset.recommendedMaxDurationSeconds && params.durationSeconds) {
      if (params.durationSeconds > preset.recommendedMaxDurationSeconds) {
        return {
          isValid: true,
          warning: `Thời lượng video (${params.durationSeconds}s) vượt khuyến nghị chuẩn của ${preset.platformLabel} (${preset.recommendedMaxDurationSeconds}s).`,
        }
      }
    }
  }

  return { isValid: true }
}
