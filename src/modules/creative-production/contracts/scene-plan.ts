/**
 * Hợp đồng "kịch bản sản xuất tổng" (ScenePlan v2) — sinh ở Chặng 05, dùng chung
 * cho Khu vực B/C/D/E và Chặng 07. Phản chiếu `domain/scene-plan-rules.ts`.
 */

import { z } from "zod"

import { LOCAL_BACKDROPS, MAX_SCENE_SECONDS } from "../domain/scene-plan-rules"
import { PRODUCTION_OUTPUTS, PUBLISH_PLATFORMS, PUBLISH_RATIOS } from "../domain/publishing-rules"
import { jobStatusSchema, packageChannelSchema, productionModeSchema, usageSchema } from "./common"

export const scenePlanBeatSchema = z.enum(["SETUP", "RISING", "CLIMAX", "RESOLUTION", "CTA"])
export const motionEffectSchema = z.enum(["zoom_in", "zoom_out", "pan_left", "pan_right", "pan_up", "static"])
/** Khớp `TRANSITIONS` của domain — `conformance.ts` khoá hai bên. */
export const scenePlanTransitionSchema = z.enum(["fade", "slide_left", "slide_right", "zoom_in", "zoom_out", "dissolve"])
export const publishPlatformSchema = z.enum(PUBLISH_PLATFORMS)
export const publishRatioSchema = z.enum(PUBLISH_RATIOS)
export const productionOutputSchema = z.enum(PRODUCTION_OUTPUTS).describe("Loại kết quả: content | audio | image | video")
export const videoFormatSchema = z.enum(["REEL_15S", "TIKTOK_30S", "STORY_15S", "SLIDESHOW", "PRODUCT_PAGE", "AD_MOTION"])
export const captionStyleSchema = z.enum(["MODERN_BADGE", "MINIMAL_ELEGANT", "HIGHLIGHT_BOX", "BOTTOM_BANNER", "NONE"])
export const musicMoodSchema = z.enum(["romantic", "upbeat", "chill", "warm", "luxury", "none"])
export const pacingSchema = z.enum(["slow", "medium", "fast"])
export const qualityTierSchema = z.enum(["standard", "hd", "premium"])
export const localBackdropSchema = z.enum(
  Object.keys(LOCAL_BACKDROPS) as [keyof typeof LOCAL_BACKDROPS, ...(keyof typeof LOCAL_BACKDROPS)[]]
)

export const scenePlanSceneSchema = z.object({
  sceneIndex: z.number().int().min(1).max(5),
  beat: scenePlanBeatSchema,
  title: z.string(),
  setting: z.string().describe("Bối cảnh, tiếng Việt — hiển thị cho chủ tiệm"),
  lighting: z.string(),
  palette: z.array(z.string()),
  purpose: z.string(),
  backgroundPrompt: z.string().describe("Mô tả hậu cảnh tiếng Anh gửi Stability — không hoa, không người, không chữ"),
  localBackdrop: localBackdropSchema,
  voiceScript: z.string(),
  textOverlay: z.string(),
  motionEffect: motionEffectSchema,
  durationSeconds: z.number().max(MAX_SCENE_SECONDS),
  transition: scenePlanTransitionSchema,
  shot: z.enum(["close", "medium", "wide"]),
  musicCue: z.enum(["soft", "build", "peak", "resolve"]),
})

export const scenePlanSchema = z.object({
  version: z.literal(2),
  source: z.enum(["ai", "rule"]).describe("ai = mô hình viết qua job; rule = kịch bản cơ bản khi AI lỗi"),
  mode: productionModeSchema,
  topicId: z.string(),
  topicTitle: z.string(),
  emotionalTone: z.string(),
  reasoning: z.string(),
  scenes: z.array(scenePlanSceneSchema).describe("CREATIVE 5 cảnh, AUTHENTIC 3 cảnh"),
  revision: z.number().int().min(1),
  story: z.object({ hook: z.string(), cta: z.string(), logline: z.string() }),
  publishing: z
    .object({
      platforms: z.array(publishPlatformSchema),
      allPlatforms: z.boolean(),
      outputs: z.array(productionOutputSchema).describe("Loại kết quả người dùng chọn"),
      allOutputs: z.boolean(),
      derivedOutputs: z.array(productionOutputSchema).describe("Tự thêm vì phụ thuộc (video ⇒ ảnh + âm thanh)"),
      produce: z.array(productionOutputSchema).describe("Sẽ sản xuất = chọn + phụ thuộc"),
      ratios: z.array(publishRatioSchema).describe("Mọi khung cần sinh; aspectRatio là khung chính"),
      videoVariants: z
        .array(
          z.object({
            ratio: publishRatioSchema,
            videoFormat: videoFormatSchema,
            targetSeconds: z.number(),
            platforms: z.array(publishPlatformSchema),
          })
        )
        .describe("Một video mỗi khung"),
      aspectRatio: publishRatioSchema,
      otherRatios: z.array(z.object({ platform: publishPlatformSchema, ratio: publishRatioSchema })),
    })
    .describe("Phạm vi sản xuất (PO 24/09/2026 tối): nền tảng × loại kết quả, rỗng = tất cả"),
  video: z.object({
    format: videoFormatSchema,
    totalDurationSeconds: z.number(),
    captionStyle: captionStyleSchema,
    hasSubtitle: z.boolean(),
    hasWatermark: z.boolean(),
    coverSceneIndex: z.number().int(),
    endCardText: z.string(),
  }),
  audio: z.object({
    voiceId: z.string(),
    qualityTier: qualityTierSchema,
    musicMood: musicMoodSchema,
    pacing: pacingSchema,
  }),
  content: z.object({
    posts: z.array(z.object({ channel: packageChannelSchema, text: z.string(), hashtags: z.array(z.string()) })),
    videoCaption: z.object({ text: z.string(), hashtags: z.array(z.string()) }),
  }),
})

/** Kết quả job `creative.scene_plan` như API trả (POST/GET/PATCH scene-plans). */
export const scenePlanJobResultSchema = z.object({
  job_id: z.string().nullable(),
  status: jobStatusSchema.nullable(),
  error: z.string().nullable(),
  plan: scenePlanSchema.nullable(),
})

export const scenePlanCreateResultSchema = scenePlanJobResultSchema.extend({
  job_id: z.string(),
  deduped: z.boolean(),
  usage: usageSchema,
})
