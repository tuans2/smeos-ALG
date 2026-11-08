import { z } from "zod"

import { campaignPackageViewSchema, campaignPerformanceSchema } from "@/modules/creative-production/contracts/campaign-package"
import { scenePlanCreateResultSchema, scenePlanJobResultSchema, scenePlanSceneSchema } from "@/modules/creative-production/contracts/scene-plan"
import { contentDraftSchema } from "@/modules/creative-production/contracts/stage-06a-content"

/**
 * Phản hồi Creative Studio `/api/v1/creative-production/*` (OpenAPI nội bộ, PO 07/11/2026). Gói chiến dịch, hiệu quả,
 * kịch bản phân cảnh và bản nháp nội dung dùng thẳng hợp đồng chặng của module (`creative-production/contracts/`, SSOT
 * của 14 chặng); phần còn lại sinh từ kiểu TS của use-case. Kiểm bằng phản hồi thật ở
 * `tests/tenant/internal-contract-creative.test.ts`.
 */
const usage = z.strictObject({ cost_credit: z.number(), balance_after: z.number().nullable() })

export const contentDraftResponse = z.strictObject({ draft: contentDraftSchema.nullable() })
export const contentRewriteResponse = z.strictObject({
  job_id: z.string(),
  text: z.string(),
  hashtags: z.array(z.string()),
  warnings: z.array(z.string()),
  usage,
})
export const campaignPackageResponse = campaignPackageViewSchema
export const campaignPackagesResponse = z.strictObject({
  data: z.array(
    z.strictObject({ id: z.string(), name: z.string(), status: z.string(), master_asset_id: z.string(), approved_at: z.string().nullable(), created_at: z.string() })
  ),
})
export const campaignPerformanceResponse = campaignPerformanceSchema
export const scenePlanCreatedResponse = scenePlanCreateResultSchema
/** Không tìm thấy kịch bản theo khoá → mọi trường `null`. */
export const scenePlanResponse = scenePlanJobResultSchema
export const sceneRevisionResponse = z.strictObject({
  job_id: z.string(),
  scene: scenePlanSceneSchema,
  /** Phiên bản kịch bản sau khi sửa — ảnh sinh lại mang số này. */
  scene_plan_revision: z.number().nullable(),
  usage,
})
const MOTION = z.enum(["ZOOM_IN", "ZOOM_OUT", "PAN_UP", "PAN_RIGHT", "STATIC"])
export const videoAssemblyResponse = z.strictObject({
  ready: z.boolean(),
  /** Thiếu ảnh cảnh, thiếu/chưa xong giọng đọc, sai thời lượng, khung ngoài phạm vi… — `ready = false`. */
  problems: z.array(z.strictObject({ kind: z.string(), message: z.string(), sceneIndex: z.number().optional() })),
  warnings: z.array(z.string()),
  format: z.enum(["REEL_15S", "TIKTOK_30S", "STORY_15S", "SLIDESHOW", "PRODUCT_PAGE", "AD_MOTION"]),
  aspect_ratio: z.string(),
  total_duration_seconds: z.number(),
  scenes: z.array(
    z.strictObject({
      sceneIndex: z.number(),
      durationSeconds: z.number(),
      imageAssetId: z.string(),
      textOverlay: z.string(),
      voiceScript: z.string(),
      transitionEffect: z.enum(["fade", "slide_left", "slide_right", "dissolve", "zoom_in", "zoom_out"]),
      motionEffect: MOTION,
    })
  ),
  audio_job_id: z.string().nullable(),
  video_job_id: z.string().nullable(),
  plan: z.strictObject({ revision: z.number(), aspectRatio: z.string(), sceneCount: z.number(), ratios: z.array(z.string()) }),
})
const providerKind = z.strictObject({
  label: z.string(),
  order: z.array(z.string()),
  providers: z.array(
    z.strictObject({ key: z.string(), label: z.string(), display_name: z.string(), vendor: z.string(), quality: z.string(), note: z.string(), configured: z.boolean() })
  ),
  local_fallback: z.strictObject({ key: z.string(), label: z.string() }).nullable(),
})
export const providerPreferencesResponse = z.strictObject({
  kinds: z.strictObject({ content: providerKind, image_optimize: providerKind, image_variant: providerKind, video: providerKind, voice: providerKind, music: providerKind }),
})
