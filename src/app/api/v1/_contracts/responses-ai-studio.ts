import { z } from "zod"
import { actionDone } from "./responses-actions"

import { jobStatusSchema, usageSchema } from "@/modules/creative-production/contracts/common"
import { videoJobRecordSchema } from "@/modules/creative-production/contracts/stage-06d-video"

import { timestamp } from "./responses-orders"

export { audioJobResultSchema } from "@/modules/creative-production/contracts/stage-06b-audio"

/**
 * Phản hồi `/jobs/*`, `/vision/*`, `/audio/*`, `/video/*` (OpenAPI nội bộ, PO 07/11/2026). Sinh từ kiểu TS của use-case
 * rồi kiểm bằng phản hồi thật ở `tests/tenant/internal-contract-ai-studio.test.ts`. Job âm thanh/video dùng hợp đồng
 * Chặng 06b/06d của Creative Studio. Mọi URL ảnh/âm thanh/video là URL ký có hạn.
 */
const generationJob = z.strictObject({
  id: z.string(),
  organization_id: z.string(),
  workspace_id: z.string(),
  branch_id: z.string().nullable(),
  user_id: z.string(),
  product_id: z.string().nullable(),
  feature: z.string(),
  status: jobStatusSchema,
  stage: z.string().nullable(),
  result: z.string().nullable(),
  idempotency_key: z.string().nullable(),
  job_group_id: z.string().nullable(),
  request_id: z.string().nullable(),
  run_after: timestamp.nullable(),
  failure_kind: z.string().nullable(),
  payload: z.unknown(),
  output: z.unknown(),
  error: z.string().nullable(),
  attempts: z.number(),
  created_at: timestamp,
  started_at: timestamp.nullable(),
  completed_at: timestamp.nullable(),
  cancelled_at: timestamp.nullable(),
  updated_at: timestamp,
})
export const jobResponse = z.strictObject({ job: generationJob })
export const jobsResponse = z.strictObject({ data: z.array(generationJob), next_cursor: z.string().nullable() })
export const jobCreatedResponse = z.strictObject({ job_id: z.string(), status: jobStatusSchema, usage: usageSchema })

// ── Phân tích ảnh (M01) ──────────────────────────────────────────────────────────────────────────────────
const VISION_ENGINE = z.enum(["openai_structured", "openai_direct", "local_cv"])
const APPROVAL = z.enum(["PENDING", "APPROVED", "REJECTED"])
export const analysisCreatedResponse = z.strictObject({ job_id: z.string(), status: z.string(), engine: VISION_ENGINE, usage: usageSchema })
const analysisCore = {
  id: z.string(),
  product_id: z.string().nullable(),
  asset_id: z.string(),
  image_url: z.string().nullable(),
  job_id: z.string(),
  provider: z.string(),
  model: z.string(),
  model_version: z.string(),
  contract_name: z.string(),
  contract_version: z.string(),
  approval_state: APPROVAL,
  approved_by: z.string().nullable(),
}
export const analysisResponse = z.strictObject({
  ...analysisCore,
  raw: z.record(z.string(), z.unknown()),
  edited: z.record(z.string(), z.unknown()).nullable(),
  approved_at: timestamp.nullable(),
  created_at: timestamp,
})
export const analysesResponse = z.strictObject({
  data: z.array(
    z.strictObject({
      ...analysisCore,
      organization_id: z.string(),
      raw: z.unknown(),
      edited: z.unknown(),
      approved_at: timestamp.nullable(),
      created_at: timestamp,
      updated_at: timestamp.optional(),
      product: z.strictObject({ id: z.string(), name: z.string(), code: z.string(), category: z.string().nullable() }).nullable().optional(),
    })
  ),
  next_cursor: z.string().nullable(),
})
export const visionEngineResponse = z.strictObject({
  dang_dung: VISION_ENGINE,
  danh_sach: z.array(
    z.strictObject({
      key: VISION_ENGINE,
      ten: z.string(),
      mo_ta: z.string(),
      trang_thai: z.enum(["san_xuat", "thu_nghiem", "chua_san_sang"]),
      gui_anh_ra_ngoai: z.boolean(),
    })
  ),
})

// ── Âm thanh ─────────────────────────────────────────────────────────────────────────────────────────────
const TASK = z.enum(["VOICEOVER", "MUSIC_SELECT", "AUDIO_MIX", "VOICE_CLONE"])
export const audioJobResponse = z.strictObject({
  job_id: z.string(),
  stage: z.enum(["COMPLETED", "FAILED", "DRAFT", "GENERATING"]),
  task_type: TASK,
  voice_id: z.string().nullable(),
  voice_display_name: z.string().nullable(),
  voice_clone_id: z.string().nullable(),
  provider_key: z.string().nullable(),
  provider_used: z.string().nullable(),
  provider_fallback: z.boolean(),
  quality_tier: z.string().nullable(),
  music_track_id: z.string().nullable(),
  music_track_name: z.string().nullable(),
  music_mood: z.enum(["none", "romantic", "upbeat", "chill", "warm", "luxury"]),
  music_provider: z.string().nullable(),
  music_provider_used: z.string().nullable(),
  music_fallback: z.boolean(),
  music_fallback_reason: z.string().nullable(),
  has_voice: z.boolean(),
  total_duration_seconds: z.number(),
  loudness_lufs: z.number().nullable(),
  /** Thời lượng thật từng cảnh do worker ghi. */
  scenes: z.array(z.unknown()),
  audio_url: z.string().nullable(),
  audio_storage_key: z.string().nullable(),
  voice_only_url: z.string().nullable(),
  voice_only_storage_key: z.string().nullable(),
  credits_cost: z.number(),
  scene_plan_id: z.string().nullable(),
  scene_plan_revision: z.number().nullable(),
  refunded: z.boolean(),
  error: z.string().nullable(),
  created_at: timestamp,
})
const musicTrack = z.strictObject({
  /** Bài hệ thống: mã danh mục; bài tiệm tải: `org:<uuid>`. */
  track_id: z.string(),
  title: z.string(),
  mood: z.string(),
  duration_seconds: z.number().nullable(),
  source: z.enum(["system", "org"]),
  license_type: z.string(),
  license_source: z.string(),
  license_verified: z.boolean(),
  preview_url: z.string(),
})
export const musicTracksResponse = z.strictObject({ tracks: z.array(musicTrack) })
export const musicTrackResponse = z.strictObject({ track: musicTrack })
export const musicTrackDeletedResponse = actionDone("deleted")
const voiceClone = z.strictObject({
  id: z.string(),
  name: z.string(),
  status: z.enum(["PENDING", "FAILED", "READY", "DELETED"]),
  provider: z.string(),
  error: z.string().nullable(),
  job_id: z.string().nullable(),
  sample_url: z.string().nullable(),
  consented_at: timestamp,
  created_at: timestamp,
})
export const voiceClonesResponse = z.strictObject({ voice_clones: z.array(voiceClone) })
export const voiceCloneResponse = z.strictObject({ voice_clone: voiceClone })
export const voiceCloneCreatedResponse = z.strictObject({
  voice_clone: voiceClone.nullable(),
  job_id: z.string(),
  usage: z.strictObject({ costCredit: z.number(), balanceAfter: z.number().nullable() }),
  deduped: z.boolean(),
})
export const voiceCloneDeletedResponse = z.strictObject({ provider_deleted: z.boolean() })

// ── Video ────────────────────────────────────────────────────────────────────────────────────────────────
export { videoJobRecordSchema }
export const videoJobsResponse = z.strictObject({ data: z.array(videoJobRecordSchema) })
export const videoJobViewResponse = videoJobRecordSchema.extend({ final_video_view_url: z.string().nullable() })
export const videoRenderResponse = z.strictObject({ videoJob: videoJobRecordSchema, generationJobId: z.string() })
