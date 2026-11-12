import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { assembleVideoFromPlan } from "@/modules/creative-production/use-cases/assemble-video"
import { videoAssemblyBody } from "@/app/api/v1/_contracts/requests-creative"
import { defineRoute } from "@/core/http/define-route"

/**
 * `POST /api/v1/creative-production/video-assembly` (`I1`, Đợt 4 24/09/2026) —
 * dựng video từ bộ tài sản của kịch bản sản xuất tổng: ảnh Khu vực D (đúng
 * kịch bản, đúng cảnh) + nguyên bản phối Khu vực C + phụ đề/chuyển cảnh/khuôn
 * của kịch bản. `dry_run: true` chỉ kiểm tra sẵn sàng. Thiếu ảnh/âm thanh → 200
 * với `ready: false` + danh sách `problems` (không tạo job). Không trừ credit
 * (render trừ `video.render` sau P3).
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ request, ctx }) => {
    const parsed = videoAssemblyBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const d = parsed.data
    const r = await assembleVideoFromPlan(ctx, {
      scenePlanId: d.scene_plan_id,
      plan: d.plan,
      masterAssetId: d.master_asset_id,
      audioJobId: d.audio_job_id ?? null,
      title: d.title,
      dryRun: d.dry_run ?? false,
      ratio: d.ratio ?? null,
    })
    return jsonResponse({
      ready: r.assembly.ready,
      problems: r.assembly.problems,
      warnings: r.assembly.warnings,
      format: r.assembly.format,
      aspect_ratio: r.assembly.aspectRatio,
      total_duration_seconds: r.assembly.totalDurationSeconds,
      scenes: r.assembly.scenes,
      audio_job_id: r.audioJobId,
      video_job_id: r.videoJobId,
      plan: r.plan,
    })
  },
})
