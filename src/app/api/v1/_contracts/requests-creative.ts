import { z } from "zod"

import { packagePostsSchema } from "@/modules/creative-production/contracts/common"
import { productionOutputsScopeSchema, publishPlatformsScopeSchema } from "@/modules/creative-production/contracts/stage-05-choose"
import { PACKAGE_CHANNELS } from "@/modules/creative-production/domain/campaign-package-rules"
import { PROVIDER_KINDS } from "@/modules/creative-production/domain/provider-catalog"
import { PUBLISH_RATIOS } from "@/modules/creative-production/domain/publishing-rules"
import { MAX_INSTRUCTION_LENGTH } from "@/modules/creative-production/domain/revision-rules"

/**
 * Lược đồ yêu cầu của Creative Studio `/api/v1/creative-production/*` (OpenAPI nội bộ, PO 07/11/2026 — chỉ ghi tài liệu,
 * không đổi hành vi, PO 08/11/2026). Hợp đồng chặng của module (`creative-production/contracts/`) được dùng thẳng; lược
 * đồ từng khai trong route được chuyển NGUYÊN VĂN về đây và route import lại.
 */
export { approveBodySchema } from "@/modules/creative-production/contracts/stage-09-approve"
export { contentDraftBodySchema, contentDraftKeySchema } from "@/modules/creative-production/contracts/stage-06a-content"
export { createPackageBodySchema } from "@/modules/creative-production/contracts/stage-07-package"
export { launchPlanBodySchema } from "@/modules/creative-production/contracts/campaign-package"
export { scenePlanBodySchema } from "@/modules/creative-production/contracts/stage-05-choose"

// content-rewrites/route.ts
export const contentRewriteBody = z.object({
  channel: z.enum(PACKAGE_CHANNELS),
  text: z.string().max(70000),
  hashtags: z.array(z.string().max(100)).max(60).default([]),
  instruction: z.string().trim().min(3).max(MAX_INSTRUCTION_LENGTH),
  product_name: z.string().max(200).default(""),
  topic_title: z.string().max(500).default(""),
  price_range: z.string().max(80).optional(),
})

// package/route.ts
export const packageCampaignBody = z.object({
  campaignName: z.string().optional(),
  authenticResult: z.any().optional(),
  creativeResult: z.any().optional(),
})

// packages/[id]/route.ts
export const patchPackageBody = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  posts: packagePostsSchema.optional(),
  variant_asset_ids: z.array(z.string().min(1)).max(40).optional(),
  video_job_id: z.string().min(1).nullable().optional(),
  /** Mọi video của gói (mỗi khung một video) — thay trọn danh sách. */
  video_job_ids: z.array(z.string().min(1)).max(8).optional(),
  audio_job_id: z.string().min(1).nullable().optional(),
})

// plan/route.ts
export const planBody = z.object({
  brief: z.object({
    organizationId: z.string().min(1),
    mode: z.enum(["AUTHENTIC", "CREATIVE"]),
    productContext: z.object({
      sourceImageUrl: z.string(),
      sourceImageStorageKey: z.string().optional(),
      commercialPassport: z.object({
        productName: z.string(),
        category: z.string(),
        style: z.string(),
        components: z.array(z.string()),
        colors: z.array(z.string()),
        priceRange: z.string().optional(),
        targetAudience: z.string().optional(),
        suggestedOccasions: z.array(z.string()).optional(),
      }),
      sourceVideoUrl: z.string().optional(),
      sourceVideoDurationSeconds: z.number().optional(),
    }),
    selectedTopics: z.array(z.object({
      topicId: z.string(),
      topicTitle: z.string(),
      topicAngle: z.string(),
      topicCategory: z.string(),
      topicHook: z.string(),
      topicCta: z.string(),
      topicEmotionalTone: z.string(),
      researchKeywords: z.array(z.string()).optional(),
      trendScore: z.number().optional(),
    })),
    voiceId: z.string().optional(),
    musicMood: z.string().optional(),
    targetVideoDurationSeconds: z.number().optional(),
  }),
})

// produce/route.ts
export const produceBody = z.object({
  brief: z.object({
    mode: z.enum(["AUTHENTIC", "CREATIVE"]),
    productContext: z.object({
      sourceImageUrl: z.string(),
      sourceImageStorageKey: z.string().optional(),
      commercialPassport: z.object({
        productName: z.string(),
        category: z.string(),
        style: z.string(),
        components: z.array(z.string()),
        colors: z.array(z.string()),
        priceRange: z.string().optional(),
        targetAudience: z.string().optional(),
        suggestedOccasions: z.array(z.string()).optional(),
      }),
      sourceVideoUrl: z.string().optional(),
      sourceVideoDurationSeconds: z.number().optional(),
    }),
    selectedTopics: z.array(z.object({
      topicId: z.string(),
      topicTitle: z.string(),
      topicAngle: z.string(),
      topicCategory: z.string(),
      topicHook: z.string(),
      topicCta: z.string(),
      topicEmotionalTone: z.string(),
      researchKeywords: z.array(z.string()).optional(),
      trendScore: z.number().optional(),
    })),
    voiceId: z.string().optional(),
    musicMood: z.string().optional(),
    targetVideoDurationSeconds: z.number().optional(),
  }),
})

const sceneEdit = z.object({
  scene_index: z.number().int().min(1).max(5),
  duration_seconds: z.number().min(0.5).max(15).optional(),
  voice_script: z.string().max(300).optional(),
  text_overlay: z.string().max(60).optional(),
  transition: z.enum(["fade", "slide_left", "slide_right", "zoom_in", "zoom_out", "dissolve"]).optional(),
  motion_effect: z.enum(["zoom_in", "zoom_out", "pan_left", "pan_right", "pan_up", "static"]).optional(),
})

// scene-plans/[id]/route.ts
export const patchScenePlanBody = z.object({
  platforms: publishPlatformsScopeSchema.optional(),
  outputs: productionOutputsScopeSchema.optional(),
  scenes: z.array(sceneEdit).max(5).optional(),
  audio: z
    .object({
      voice_id: z.string().max(80).optional(),
      music_mood: z.enum(["romantic", "upbeat", "chill", "warm", "luxury", "none"]).optional(),
      pacing: z.enum(["slow", "medium", "fast"]).optional(),
      quality_tier: z.enum(["standard", "hd", "premium"]).optional(),
    })
    .optional(),
  video: z
    .object({
      caption_style: z.enum(["MODERN_BADGE", "MINIMAL_ELEGANT", "HIGHLIGHT_BOX", "BOTTOM_BANNER", "NONE"]).optional(),
      has_subtitle: z.boolean().optional(),
      has_watermark: z.boolean().optional(),
      end_card_text: z.string().max(60).optional(),
      cover_scene_index: z.number().int().min(1).max(5).optional(),
    })
    .optional(),
  posts: z
    .array(z.object({ channel: z.enum(["facebook", "instagram", "tiktok", "zalo"]), text: z.string().max(70000), hashtags: z.array(z.string().max(100)).max(60).optional() }))
    .max(4)
    .optional(),
})

// scene-plans/route.ts
export const scenePlanLookupQuery = z.object({
  asset_id: z.string().uuid(),
  topic_id: z.string().trim().min(1).max(120),
  mode: z.enum(["CREATIVE", "AUTHENTIC"]),
})

const sceneSchema = z.object({
  sceneIndex: z.number().int().min(1).max(5),
  beat: z.enum(["SETUP", "RISING", "CLIMAX", "RESOLUTION", "CTA"]),
  title: z.string().max(80),
  setting: z.string().max(300),
  lighting: z.string().max(120),
  palette: z.array(z.string().max(30)).max(5),
  purpose: z.string().max(120),
  backgroundPrompt: z.string().max(600),
  localBackdrop: z.enum(["studio_white", "wedding", "living_room", "wood_minimal", "luxury_hotel"]),
  voiceScript: z.string().max(300),
  textOverlay: z.string().max(60),
  motionEffect: z.enum(["zoom_in", "zoom_out", "pan_left", "pan_right", "pan_up", "static"]),
})

// scene-revisions/route.ts
export const sceneRevisionBody = z.object({
  instruction: z.string().trim().min(3).max(MAX_INSTRUCTION_LENGTH),
  scene_plan_id: z.string().uuid().nullish(),
  scene_index: z.number().int().min(1).max(5),
  scene: sceneSchema.nullish(),
  mode: z.enum(["CREATIVE", "AUTHENTIC"]),
  topic_title: z.string().max(500).default(""),
  product_name: z.string().max(200).default(""),
  colors: z.array(z.string().max(60)).max(12).default([]),
})

// video-assembly/route.ts
export const videoAssemblyBody = z.object({
  scene_plan_id: z.string().trim().min(1).max(160),
  /** Chỉ với kịch bản cơ bản (`rule:…`) — kịch bản AI đọc từ kho. */
  plan: z.unknown().optional(),
  master_asset_id: z.string().uuid(),
  audio_job_id: z.string().uuid().optional(),
  title: z.string().max(200).optional(),
  dry_run: z.boolean().optional(),
  /** Khung của video — mỗi khung trong phạm vi một video (PO 24/09/2026). */
  ratio: z.enum(PUBLISH_RATIOS).optional(),
})


// ── Lược đồ mô tả: thân do use-case tự kiểm ──────────────────────────────────────────────────────────────
/** `setProviderOrder` — `kind` là một nhóm (content, image_optimize, image_variant, video, voice, music); `order` là mã nhà cung cấp theo thứ tự ưu tiên. */
export const providerOrderBody = z.object({
  kind: z.enum(PROVIDER_KINDS),
  order: z.array(z.string()),
})
