import { z } from "zod"

import { videoFormatSchema } from "@/modules/creative-production/contracts/scene-plan"
import { videoStageSchema } from "@/modules/creative-production/contracts/stage-06d-video"
import { MUSIC_LICENSE_TYPES } from "@/modules/audio-studio/domain/audio-task-rules"
import { VISION_ENGINES } from "@/modules/products/domain/vision-engine"

/**
 * Lược đồ yêu cầu của `/jobs/*`, `/vision/*`, `/audio/*`, `/video/*` (OpenAPI nội bộ, PO 07/11/2026). Thân job âm thanh
 * và video là hợp đồng Chặng 06b/06d của Creative Studio; lược đồ từng khai trong route được chuyển NGUYÊN VĂN về đây
 * và route import lại; còn lại (query, multipart) chỉ để mô tả — route tự đọc.
 */
export { audioJobBodySchema } from "@/modules/creative-production/contracts/stage-06b-audio"
export { videoJobBodySchema } from "@/modules/creative-production/contracts/stage-06d-video"

const int = z.string().regex(/^-?\d+$/)
export const cursorQuery = z.object({ limit: int.optional(), cursor: z.string().optional() })

// jobs/batch
export const jobBatchBody = z.object({
  product_id: z.string().trim().min(1, "Thiếu productId").max(64),
  master_image_id: z.string().trim().min(1).max(64).optional(),
  feature: z.string().trim().min(1, "Thiếu feature").max(64),
  capabilities: z.array(z.string().trim().min(1).max(32)).min(1, "Danh sách capabilities rỗng").max(50),
  module: z.string().trim().min(1, "Thiếu module").max(16),
})

// vision/analyses
export const visionAnalysisBody = z.object({
  asset_ids: z.array(z.string().min(1)).min(1),
  product_id: z.string().min(1).nullable().optional(),
})

// vision/analyses/[id]/reject
export const rejectAnalysisBody = z.object({
  ly_do: z.string().max(500).nullish(),
})

// vision/analyses/[id]
export const editAnalysisBody = z.object({
  edited: z.record(z.string(), z.unknown()),
})

// vision/engine
export const visionEngineBody = z.object({ bo_may: z.enum(VISION_ENGINES) })

// video/jobs/[id]/render
export const videoRenderBody = z.object({
  scene_images: z
    .array(z.object({ scene_index: z.number().int().min(1).max(30), asset_id: z.string().uuid() }))
    .max(30)
    .optional(),
  // PO 25/09/2026: nhà cung cấp cho lượt này; vắng = theo thứ tự ưu tiên của tiệm.
  video_provider: z.enum(["veo", "kling", "runway", "luma", "local_cinematic"]).optional(),
})

// video/jobs/[id]/storyboard
export const storyboardBody = z.object({
  scenes: z.array(
    z.object({
      sceneIndex: z.number().optional(),
      durationSeconds: z.number().min(0.5).max(15),
      imageAssetId: z.string().nullable().optional(),
      imageUrl: z.string().nullable().optional(),
      textOverlay: z.string().nullable().optional(),
      voiceScript: z.string().nullable().optional(),
      transitionEffect: z.enum([
        "fade",
        "slide_left",
        "slide_right",
        "zoom_in",
        "zoom_out",
        "dissolve",
      ]).optional(),
      motionEffect: z.enum(["ZOOM_IN", "ZOOM_OUT", "PAN_UP", "PAN_RIGHT", "STATIC"]).optional(),
    })
  ).min(1, "Phải có ít nhất 1 cảnh trong kịch bản"),
})

/** `create_product` mặc định `true` — duyệt xong tạo luôn sản phẩm từ kết quả phân tích. Thân không bắt buộc. */
export const approveAnalysisBody = z.object({ create_product: z.boolean().optional() })

/** Không có `approval_state=APPROVED` (hoặc `approved=true`) → hàng chờ duyệt (`H3`); có → kết quả đã duyệt. */
export const analysesQuery = cursorQuery.extend({ approval_state: z.string().optional(), approved: z.enum(["true", "false"]).optional() })

/** `states` lặp lại hoặc phân tách bằng dấu phẩy; `from`/`to` là ngày ISO. */
export const analysesExportQuery = z.object({ states: z.string().optional(), from: z.string().optional(), to: z.string().optional() })

export const videoJobsQuery = z.object({ productId: z.string().optional(), format: videoFormatSchema.optional(), stage: videoStageSchema.optional(), limit: int.optional() })

/** Multipart `POST /audio/music-tracks` — MP3/WAV/M4A ≤ 20MB, nhận diện bằng byte đầu; `attest=true` bắt buộc. */
export const musicTrackForm = z.object({
  file: z.file(),
  title: z.string(),
  mood: z.string(),
  license_type: z.enum(MUSIC_LICENSE_TYPES),
  license_source: z.string(),
  license_note: z.string().optional(),
  attest: z.literal("true"),
})

/** Multipart `POST /audio/voice-clones` — mẫu MP3/WAV/M4A 50KB–10MB (worker đòi ≥ 20 giây); `consent=true` bắt buộc. */
export const voiceCloneForm = z.object({ name: z.string(), sample: z.file(), consent: z.literal("true") })

/** Nối tiếp luồng sự kiện sau `seq` này (thay cho header `Last-Event-ID`). */
export const jobEventsQuery = z.object({ after: int.optional() })
