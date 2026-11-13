/** Chặng 06d — CREATE / Khu vực E: video (bảng `video_jobs` + `video_scenes`). */

import { z } from "zod"

import { defineStage } from "./define-stage"
import { approvalStateSchema, isoDateTimeSchema } from "./common"
import { captionStyleSchema, videoFormatSchema } from "./scene-plan"
import { EXAMPLE_JOB_ID, EXAMPLE_NOW, EXAMPLE_PRODUCT_ID } from "./examples-shared"

export const videoStageSchema = z.enum([
  "DRAFT",
  "SCRIPT_GENERATING",
  "SCRIPT_READY",
  "SCRIPT_APPROVED",
  "RENDERING",
  "RENDER_COMPLETED",
  "APPROVED",
  "REJECTED",
  "FAILED",
])

/** Thân `POST /api/v1/video/jobs`. */
export const videoJobBodySchema = z.object({
  productId: z.string().nullable().optional(),
  title: z.string().min(1, "Tiêu đề không được để trống"),
  format: videoFormatSchema,
  aspectRatio: z.string().optional().describe("Mặc định 9:16"),
  musicTrack: z.string().nullable().optional(),
  voiceCode: z.string().nullable().optional(),
  hasSubtitle: z.boolean().optional(),
  captionStyle: captionStyleSchema.optional(),
  hasWatermark: z.boolean().optional(),
  scenes: z
    .array(
      z.object({
        sceneIndex: z.number().optional(),
        durationSeconds: z.number().min(0.5).max(15),
        imageAssetId: z.string().nullable().optional(),
        textOverlay: z.string().nullable().optional(),
        voiceScript: z.string().nullable().optional(),
        transitionEffect: z.string().optional(),
        motionEffect: z.enum(["ZOOM_IN", "ZOOM_OUT", "PAN_UP", "PAN_RIGHT", "STATIC"]).optional(),
      })
    )
    .optional(),
})

export const videoSceneRecordSchema = z.looseObject({
  id: z.string(),
  video_job_id: z.string(),
  scene_index: z.number().int(),
  duration_seconds: z.number(),
  image_asset_id: z.string().nullable(),
  text_overlay: z.string().nullable(),
  voice_script: z.string().nullable(),
  transition_effect: z.string().nullable(),
  motion_effect: z.string().nullable(),
  created_at: isoDateTimeSchema,
})

/** Bản ghi `video_jobs` kèm `scenes` như API trả (cột phụ khác giữ nguyên). */
export const videoJobRecordSchema = z.looseObject({
  id: z.string(),
  organization_id: z.string(),
  product_id: z.string().nullable(),
  title: z.string(),
  format: videoFormatSchema,
  stage: videoStageSchema,
  script_approval: approvalStateSchema,
  video_approval: approvalStateSchema,
  duration_seconds: z.number().int(),
  aspect_ratio: z.string(),
  music_track: z.string().nullable(),
  voice_code: z.string().nullable(),
  has_subtitle: z.boolean(),
  caption_style: z.string(),
  has_watermark: z.boolean(),
  scene_plan_id: z.string().nullable(),
  scene_plan_revision: z.number().int().nullable(),
  audio_job_id: z.string().nullable(),
  audio_storage_key: z.string().nullable(),
  final_video_url: z.string().nullable(),
  final_asset_id: z.string().nullable(),
  cost_credits: z.number().int(),
  error_message: z.string().nullable(),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
  scenes: z.array(videoSceneRecordSchema),
})

export const stage06dVideo = defineStage({
  id: "06d",
  stage: 6,
  code: "CREATE_VIDEO",
  slug: "create-video",
  title: "Chặng 06d — CREATE · Khu vực E: Video",
  summary:
    "Tạo job video (DRAFT) với storyboard theo kịch bản; duyệt kịch bản (P3) → render → duyệt video (P4) ngay trong Khu vực E.",
  endpoint: { method: "POST", path: "/api/v1/video/jobs", capability: "I1" },
  input: videoJobBodySchema,
  output: videoJobRecordSchema,
  examples: {
    input: {
      productId: EXAMPLE_PRODUCT_ID,
      title: "12 bông hồng cho 12 tháng yêu nhau",
      format: "TIKTOK_30S",
      aspectRatio: "9:16",
      captionStyle: "MODERN_BADGE",
      scenes: [
        { sceneIndex: 1, durationSeconds: 4, imageAssetId: "e5f6a7b8-c9d0-4e1f-8a2b-3c4d5e6f7a8c", textOverlay: "12 tháng yêu nhau", motionEffect: "ZOOM_IN" },
      ],
    },
    output: {
      id: "f6a7b8c9-d0e1-4f2a-8b3c-4d5e6f7a8b9c",
      organization_id: "0b6f2c1e-0000-4000-8000-000000000001",
      product_id: EXAMPLE_PRODUCT_ID,
      title: "12 bông hồng cho 12 tháng yêu nhau",
      format: "TIKTOK_30S",
      stage: "DRAFT",
      script_approval: "PENDING",
      video_approval: "PENDING",
      duration_seconds: 4,
      aspect_ratio: "9:16",
      music_track: null,
      voice_code: null,
      has_subtitle: true,
      caption_style: "MODERN_BADGE",
      has_watermark: false,
      scene_plan_id: EXAMPLE_JOB_ID,
      scene_plan_revision: 1,
      audio_job_id: null,
      audio_storage_key: null,
      final_video_url: null,
      final_asset_id: null,
      cost_credits: 0,
      error_message: null,
      created_at: EXAMPLE_NOW,
      updated_at: EXAMPLE_NOW,
      scenes: [
        {
          id: "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d",
          video_job_id: "f6a7b8c9-d0e1-4f2a-8b3c-4d5e6f7a8b9c",
          scene_index: 1,
          duration_seconds: 4,
          image_asset_id: "e5f6a7b8-c9d0-4e1f-8a2b-3c4d5e6f7a8c",
          text_overlay: "12 tháng yêu nhau",
          voice_script: null,
          transition_effect: "fade",
          motion_effect: "zoom_in",
          created_at: EXAMPLE_NOW,
        },
      ],
    },
  },
})
