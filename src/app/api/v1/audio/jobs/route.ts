import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { readIdempotencyKey } from "@/modules/jobs/domain/idempotency"
import { audioJobBodySchema } from "@/modules/creative-production/contracts/stage-06b-audio"
import { createAudioJob } from "@/modules/audio-studio/use-cases/create-audio-job"
import { defineRoute } from "@/core/http/define-route"

/** Hợp đồng Chặng 06b — nguồn chuẩn ở `contracts/stage-06b-audio.ts`. */
const postSchema = audioJobBodySchema

/**
 * `POST /api/v1/audio/jobs` (`I1`) — tạo job `audio.generate`.
 * 24/09/2026: bốn loại tác vụ ra kết quả khác nhau thật; credit trừ theo bảng
 * `audio-pricing-guard.ts` (MUSIC_SELECT = 0). Xem IO Spec §4.
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ request, ctx }) => {
    const idempotencyKey = readIdempotencyKey(request)
    if (!idempotencyKey) {
      throw validationFailed({ "idempotency-key": "Bắt buộc trên mọi endpoint tạo job (YC-U7)" })
    }

    const parsed = postSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const d = parsed.data

    const calculatedDuration =
      d.totalDurationSeconds ?? Math.max(1, d.scenes.reduce((sum, s) => sum + s.targetDurationSeconds, 0))

    const result = await createAudioJob(ctx, {
      taskType: d.taskType,
      scenes: d.scenes,
      totalDurationSeconds: calculatedDuration,
      voiceId: d.voiceId,
      voiceCloneId: d.voiceCloneId,
      providerKey: d.providerKey,
      qualityTier: d.qualityTier,
      musicTrackId: d.musicTrackId,
      musicMood: d.musicMood,
      topicAngleCategory: d.topicAngleCategory,
      musicProvider: d.musicProvider,
      scenePlanId: d.scenePlanId,
      scenePlanRevision: d.scenePlanRevision,
      idempotencyKey,
    })

    return jsonResponse(result, { status: 201 })
  },
})
