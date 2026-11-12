import { jsonResponse } from "@/core/http/response"
import { validationFailed } from "@/core/http/errors"
import { getScenePlan, updateScenePlan } from "@/modules/creative-production/use-cases/generate-scene-plan"
import { VOICE_CATALOG } from "@/modules/audio-studio/domain/voice-catalog"
import { patchScenePlanBody } from "@/app/api/v1/_contracts/requests-creative"
import { defineRoute } from "@/core/http/define-route"

/** `GET /api/v1/creative-production/scene-plans/:id` (`I1`). */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    const found = await getScenePlan(ctx, id)
    return jsonResponse({ job_id: found.jobId, status: found.status, error: found.error, plan: found.plan })
  },
})

/**
 * `PATCH /api/v1/creative-production/scene-plans/:id` (`I1`, v2 24/09/2026) —
 * sửa kịch bản sản xuất tổng tại chỗ, miễn phí, tăng `revision`.
 */
export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const parsed = patchScenePlanBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const d = parsed.data
    if (d.audio?.voice_id && !VOICE_CATALOG.some((v) => v.voiceId === d.audio?.voice_id)) {
      throw validationFailed({ voice_id: "Giọng không có trong danh mục" })
    }
    const found = await updateScenePlan(ctx, id, {
      platforms: d.platforms,
      outputs: d.outputs,
      scenes: d.scenes?.map((s) => ({
        sceneIndex: s.scene_index,
        durationSeconds: s.duration_seconds,
        voiceScript: s.voice_script,
        textOverlay: s.text_overlay,
        transition: s.transition,
        motionEffect: s.motion_effect,
      })),
      audio: d.audio
        ? {
            ...(d.audio.voice_id ? { voiceId: d.audio.voice_id } : {}),
            ...(d.audio.music_mood ? { musicMood: d.audio.music_mood } : {}),
            ...(d.audio.pacing ? { pacing: d.audio.pacing } : {}),
            ...(d.audio.quality_tier ? { qualityTier: d.audio.quality_tier } : {}),
          }
        : undefined,
      video: d.video
        ? {
            ...(d.video.caption_style ? { captionStyle: d.video.caption_style } : {}),
            ...(d.video.has_subtitle !== undefined ? { hasSubtitle: d.video.has_subtitle } : {}),
            ...(d.video.has_watermark !== undefined ? { hasWatermark: d.video.has_watermark } : {}),
            ...(d.video.end_card_text !== undefined ? { endCardText: d.video.end_card_text } : {}),
            ...(d.video.cover_scene_index ? { coverSceneIndex: d.video.cover_scene_index } : {}),
          }
        : undefined,
      posts: d.posts,
    })
    return jsonResponse({ job_id: found.jobId, status: found.status, error: found.error, plan: found.plan })
  },
})
