/**
 * Use-case: Tạo Audio Job — Đưa công việc âm thanh vào hàng đợi.
 *
 * Tuân thủ kiến trúc job: enqueueJob("audio.generate") → Worker Python
 * lấy việc bằng SELECT FOR UPDATE SKIP LOCKED + LISTEN/NOTIFY.
 *
 * 24/09/2026 — bốn loại tác vụ khác nhau THẬT (`audio-task-rules.ts`):
 * VOICEOVER chỉ giọng, MUSIC_SELECT chỉ nhạc (0 credit), AUDIO_MIX giọng +
 * nhạc, VOICE_CLONE đọc bằng giọng nhân bản READY của tiệm (ElevenLabs, không
 * lùi sang nhà cung cấp khác). Credit trừ = đúng bảng `audio-pricing-guard.ts`
 * (trước đây mọi lượt bị tính mặc định 1 credit dù màn hình ước tính khác).
 */

import { unprocessable, validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { type TenantContext } from "@/core/tenancy"
import { providerOrderFor } from "@/modules/creative-production/use-cases/provider-preferences"
import { enqueueJob } from "@/modules/jobs/use-cases/enqueue-job"
import type { AudioQualityTier, AudioSceneInput, AudioTaskType, MusicMood, TtsProviderKey } from "../domain/audio-types"
import {
  AUDIO_TASK_SPECS,
  SELECTABLE_TTS_PROVIDERS,
  VOICE_CLONE_PROVIDER,
  audioCostPlan,
  validateAudioTask,
} from "../domain/audio-task-rules"
import { getVoiceSpec, resolveProviderVoiceCode } from "../domain/voice-catalog"
import { suggestMusicTrack, suggestMoodForTopicAngle } from "../domain/music-catalog"
import { resolveMusicForJob } from "./music-tracks"
import { requireReadyVoiceClone } from "./voice-clones"

// ============================================================
// INPUT / OUTPUT
// ============================================================

export interface CreateAudioJobInput {
  /** Loại công việc. Bỏ trống: có nhạc → AUDIO_MIX, không nhạc → VOICEOVER. */
  readonly taskType?: AudioTaskType | undefined
  readonly scenes: readonly AudioSceneInput[]
  readonly totalDurationSeconds: number
  readonly voiceId?: string | undefined
  /** Giọng nhân bản (`voice_clones.id`) — bắt buộc với VOICE_CLONE. */
  readonly voiceCloneId?: string | undefined
  readonly providerKey?: TtsProviderKey | undefined
  readonly qualityTier?: AudioQualityTier | undefined
  /** Mã bài: `trackId` hệ thống hoặc `org:<uuid>` tiệm tự tải. */
  readonly musicTrackId?: string | undefined
  /** Mood — chỉ dùng để tự chọn bài khi không truyền `musicTrackId`. */
  readonly musicMood?: MusicMood | undefined
  readonly topicAngleCategory?: string | undefined
  /**
   * Nhạc nền (PO 25/09/2026 — nhà cung cấp trước): bỏ trống = theo thứ tự tiệm
   * (nhạc AI sinh theo tâm trạng, bài `musicTrackId` là đường lùi);
   * `library` = chỉ dùng bài thư viện / bài tiệm tải (0 credit).
   */
  readonly musicProvider?: string | undefined
  /** Kịch bản sản xuất tổng mà bản âm thanh thực thi (job id hoặc `rule:…`) + phiên bản. */
  readonly scenePlanId?: string | undefined
  readonly scenePlanRevision?: number | undefined
  /** `Idempotency-Key` của client (YC-U7). */
  readonly idempotencyKey: string
}

export interface CreateAudioJobResult {
  readonly jobId: string
  readonly generationJobId: string
  readonly taskType: AudioTaskType
  /** Credit của lượt này theo bảng giá (= số bị trừ nếu không deduped/dùng thử). */
  readonly creditsCost: number
  readonly voiceDisplayName: string | null
  readonly providerKey: TtsProviderKey | null
  /** Nhà cung cấp sinh nhạc đứng đầu lượt này; `null` = chỉ bài thư viện. */
  readonly musicProvider: string | null
  readonly musicTrackName: string | null
  readonly musicLicenseVerified: boolean | null
  readonly usage: { readonly costCredit: number; readonly balanceAfter: number | null }
  readonly deduped: boolean
}

// ============================================================
// USE-CASE
// ============================================================

export async function createAudioJob(ctx: TenantContext, input: CreateAudioJobInput): Promise<CreateAudioJobResult> {
  requireCapability(ctx, "I1")

  // 1. Nhạc: bài chỉ định, hoặc tự chọn theo mood (mood "none" = không nhạc).
  let musicMood: MusicMood | undefined = input.musicMood
  if (!musicMood && input.topicAngleCategory) musicMood = suggestMoodForTopicAngle(input.topicAngleCategory)
  let musicTrackId: string | undefined = input.musicTrackId
  if (!musicTrackId && musicMood && musicMood !== "none") musicTrackId = suggestMusicTrack(musicMood)?.trackId

  // 2. Loại tác vụ.
  const taskType: AudioTaskType = input.taskType ?? (musicTrackId ? "AUDIO_MIX" : "VOICEOVER")
  const spec = AUDIO_TASK_SPECS[taskType]
  if (spec.music === "none") musicTrackId = undefined
  // Nhạc AI cần một bài dự phòng: tác vụ bắt buộc nhạc mà chưa chọn bài thì lấy theo tâm trạng.
  const wantsAiMusic = spec.music !== "none" && input.musicProvider !== "library"
  if (wantsAiMusic && spec.music === "required" && !musicTrackId) {
    musicTrackId = suggestMusicTrack(musicMood && musicMood !== "none" ? musicMood : "romantic")?.trackId
  }

  const errors = validateAudioTask({
    taskType,
    scenes: input.scenes,
    musicTrackId,
    voiceCloneId: input.voiceCloneId,
  })
  if (Object.keys(errors).length > 0) throw validationFailed(errors)

  const music = musicTrackId ? await resolveMusicForJob(ctx, musicTrackId) : null

  // 3. Giọng + nhà cung cấp.
  const qualityTier = input.qualityTier ?? "standard"
  let voiceId: string | null = null
  let voiceDisplayName: string | null = null
  let providerKey: TtsProviderKey | null = null
  let providerVoiceCode: string | null = null
  let providerVoiceMap: Readonly<Partial<Record<TtsProviderKey, string>>> | null = null
  let strictProvider = false
  let providerOrder: TtsProviderKey[] = []

  if (taskType === "VOICE_CLONE") {
    const clone = await requireReadyVoiceClone(ctx, input.voiceCloneId as string)
    voiceId = `clone:${clone.id}`
    voiceDisplayName = clone.name
    providerKey = VOICE_CLONE_PROVIDER
    providerVoiceCode = clone.provider_voice_id
    // Giọng nhân bản không được âm thầm thay bằng giọng khác.
    strictProvider = true
  } else if (spec.needsVoice) {
    const voiceSpec = getVoiceSpec(input.voiceId ?? "flora-nu-truyen-cam")
    voiceId = voiceSpec.voiceId
    voiceDisplayName = voiceSpec.displayName
    // Nhà cung cấp trước (PO 25/09/2026): bên chọn cho lượt → thứ tự tiệm → mặc định.
    providerOrder = (await providerOrderFor(ctx, "voice", input.providerKey)).filter((p): p is TtsProviderKey =>
      SELECTABLE_TTS_PROVIDERS.includes(p as TtsProviderKey)
    )
    providerKey = input.providerKey ?? providerOrder[0] ?? voiceSpec.defaultProvider
    if (!SELECTABLE_TTS_PROVIDERS.includes(providerKey)) {
      throw unprocessable("Nhà cung cấp không dùng được trong bản thương mại", { providerKey: `Nhà cung cấp ${providerKey} không dùng được trong bản thương mại` })
    }
    providerVoiceCode = resolveProviderVoiceCode(voiceSpec.voiceId, providerKey)
    // Cùng một giọng ở mọi nhà cung cấp — worker lùi thì vẫn đúng giới tính/phong cách.
    providerVoiceMap = voiceSpec.providerVoiceMap
  }

  const musicProviderOrder = music && wantsAiMusic ? await providerOrderFor(ctx, "music", input.musicProvider) : []
  const costPlan = audioCostPlan({
    taskType,
    providerKey,
    qualityTier,
    scenes: input.scenes,
    musicProvider: musicProviderOrder[0] ?? null,
    musicSeconds: input.totalDurationSeconds,
  })
  const creditsCost = costPlan.voiceCredit + costPlan.musicCredit

  const enqueued = await enqueueJob(ctx, {
    feature: "audio.generate",
    idempotencyKey: input.idempotencyKey,
    productId: null,
    costCredit: creditsCost,
    payload: {
      taskType,
      output: spec.output,
      scenes: spec.needsVoice
        ? input.scenes.map((s) => ({
            sceneIndex: s.sceneIndex,
            voiceScript: s.voiceScript,
            targetDurationSeconds: s.targetDurationSeconds,
          }))
        : [],
      totalDurationSeconds: input.totalDurationSeconds,
      voiceId,
      voiceDisplayName,
      voiceCloneId: taskType === "VOICE_CLONE" ? input.voiceCloneId : null,
      providerKey,
      providerOrder,
      providerVoiceCode,
      providerVoiceMap,
      strictProvider,
      qualityTier,
      musicTrackId: music?.musicTrackId ?? null,
      // Mã bài người dùng chọn (kể cả `org:<uuid>`) — để Chặng 07 phối lại đúng bài.
      musicTrackRef: musicTrackId ?? null,
      musicStorageKey: music?.musicStorageKey ?? null,
      musicTrackName: music?.title ?? null,
      musicMood: music?.mood ?? "none",
      musicProviderOrder,
      musicPromptHint: input.topicAngleCategory ?? null,
      cost_plan: costPlan,
      voiceVolume: 1.0,
      bgmDuckingVolume: 0.22,
      bgmNormalVolume: 0.65,
      creditsCost,
      scenePlanId: input.scenePlanId ?? null,
      scenePlanRevision: input.scenePlanRevision ?? null,
    },
  })

  return {
    jobId: enqueued.job.id,
    generationJobId: enqueued.job.id,
    taskType,
    creditsCost,
    voiceDisplayName,
    providerKey,
    musicProvider: musicProviderOrder[0] ?? null,
    musicTrackName: music?.title ?? null,
    musicLicenseVerified: music ? music.licenseVerified : null,
    usage: enqueued.usage,
    deduped: enqueued.deduped,
  }
}
