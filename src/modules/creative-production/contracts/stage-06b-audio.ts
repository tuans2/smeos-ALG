/** Chặng 06b — CREATE / Khu vực C: âm thanh (job `audio.generate`). */

import { z } from "zod"

import { MAX_VOICE_SCRIPT_LENGTH } from "@/modules/audio-studio/domain/audio-task-rules"
import { defineStage } from "./define-stage"
import { musicMoodSchema, qualityTierSchema } from "./scene-plan"
import { EXAMPLE_JOB_ID } from "./examples-shared"

export const audioTaskTypeSchema = z.enum(["VOICEOVER", "MUSIC_SELECT", "AUDIO_MIX", "VOICE_CLONE"])
export const ttsProviderKeySchema = z.enum(["openai", "elevenlabs", "minimax", "edge_tts", "google_cloud", "local_fallback"])

/** Thân `POST /api/v1/audio/jobs` (header `Idempotency-Key` bắt buộc). */
export const audioJobBodySchema = z.object({
  taskType: audioTaskTypeSchema.optional().describe("Bỏ trống: có nhạc → AUDIO_MIX, không → VOICEOVER"),
  scenes: z
    .array(
      z.object({
        sceneIndex: z.number().int().min(0).max(20),
        voiceScript: z.string().max(MAX_VOICE_SCRIPT_LENGTH),
        targetDurationSeconds: z.number().positive().max(60),
      })
    )
    .max(12),
  totalDurationSeconds: z.number().positive().max(300).optional(),
  voiceId: z.string().max(80).optional(),
  voiceCloneId: z.string().uuid().optional(),
  providerKey: ttsProviderKeySchema
    .optional()
    .describe("google_cloud và local_fallback bị loại khỏi bản thương mại — máy chủ trả 422"),
  qualityTier: qualityTierSchema.optional(),
  musicTrackId: z.string().max(80).optional(),
  musicMood: musicMoodSchema.optional(),
  topicAngleCategory: z.string().max(60).optional(),
  musicProvider: z
    .enum(["elevenlabs_music", "library"])
    .optional()
    .describe("Bỏ trống = nhạc AI theo thứ tự tiệm (bài musicTrackId là dự phòng); library = chỉ bài thư viện (0 credit)"),
  scenePlanId: z.string().max(160).optional().describe("Kịch bản sản xuất tổng (Chặng 05) mà bản âm thanh thực thi"),
  scenePlanRevision: z.number().int().min(1).optional(),
})

export const audioJobResultSchema = z.object({
  jobId: z.string(),
  generationJobId: z.string(),
  taskType: audioTaskTypeSchema,
  creditsCost: z.number().describe("Credit theo bảng giá (= số bị trừ nếu không deduped/dùng thử)"),
  voiceDisplayName: z.string().nullable(),
  providerKey: ttsProviderKeySchema.nullable(),
  musicProvider: z.string().nullable().describe("Nhà cung cấp sinh nhạc đứng đầu lượt; null = chỉ bài thư viện"),
  musicTrackName: z.string().nullable(),
  musicLicenseVerified: z.boolean().nullable(),
  usage: z.object({ costCredit: z.number(), balanceAfter: z.number().nullable() }),
  deduped: z.boolean(),
})

export const stage06bAudio = defineStage({
  id: "06b",
  stage: 6,
  code: "CREATE_AUDIO",
  slug: "create-audio",
  title: "Chặng 06b — CREATE · Khu vực C: Giọng đọc & nhạc nền",
  summary:
    "Bốn tác vụ thật: VOICEOVER, MUSIC_SELECT, AUDIO_MIX, VOICE_CLONE. Nhà cung cấp trước (25/09/2026): giọng theo thứ tự tiệm, nhạc nền AI (ElevenLabs Music) với bài thư viện làm dự phòng; musicProvider=library = 0 credit phần nhạc. Kết quả cuối (audio_storage_key) đọc từ job khi COMPLETED.",
  endpoint: { method: "POST", path: "/api/v1/audio/jobs", capability: "I1", idempotencyKey: true },
  input: audioJobBodySchema,
  output: audioJobResultSchema,
  examples: {
    input: {
      taskType: "AUDIO_MIX",
      scenes: [
        { sceneIndex: 1, voiceScript: "Bạn đã nói cảm ơn người ấy bao nhiêu lần năm nay?", targetDurationSeconds: 4 },
        { sceneIndex: 2, voiceScript: "Mười hai bông hồng, cho mười hai tháng yêu nhau.", targetDurationSeconds: 5 },
      ],
      voiceId: "flora-nu-truyen-cam",
      musicMood: "romantic",
      scenePlanId: EXAMPLE_JOB_ID,
      scenePlanRevision: 1,
    },
    output: {
      jobId: "d4e5f6a7-b8c9-4d0e-8f1a-2b3c4d5e6f7a",
      generationJobId: "d4e5f6a7-b8c9-4d0e-8f1a-2b3c4d5e6f7a",
      taskType: "AUDIO_MIX",
      creditsCost: 2,
      voiceDisplayName: "Flora Nữ Truyền Cảm",
      providerKey: "edge_tts",
      musicProvider: null,
      musicTrackName: "Warm Strings",
      musicLicenseVerified: true,
      usage: { costCredit: 2, balanceAfter: 247 },
      deduped: false,
    },
  },
})
