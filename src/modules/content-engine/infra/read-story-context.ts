/**
 * Đọc `story` của Brief v1 từ kịch bản Chặng 05 (`creative.scene_plan`,
 * `ScenePlan`) — Writer kể cùng câu chuyện với ảnh/âm thanh/video của cùng
 * kịch bản (mục 3 của Brief). Vắng `scenePlanId`, hoặc job chưa xong, thì
 * `story` là `null` — bình thường, không phải lỗi (gọi rời từ `/noi-dung`
 * chẳng hạn chưa từng có kịch bản).
 *
 * Hạ tầng — được phép import Prisma/repository (khác `domain/`).
 */

import type { TenantContext } from "@/core/tenancy"
import type { IGenerationJobRepository } from "@/modules/jobs/domain/repositories/generation-job-repository.interface"
import { getGenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository"
import { SCENE_PLAN_FEATURE, parseStoredScenePlan } from "@/modules/creative-production/domain/scene-plan-rules"

import type { RawStoryInput } from "../domain/brief-builder"

export async function readStoryContext(
  ctx: TenantContext,
  scenePlanId?: string | null,
  jobRepo: IGenerationJobRepository = getGenerationJobRepository()
): Promise<RawStoryInput | null> {
  if (!scenePlanId) return null
  const job = await jobRepo.findById(ctx, scenePlanId)
  if (!job || job.feature !== SCENE_PLAN_FEATURE || job.status !== "COMPLETED") return null
  const plan = parseStoredScenePlan(job.output)
  if (!plan) return null
  return {
    scenePlanId,
    mode: plan.mode,
    logline: plan.story.logline || null,
    emotionalTone: plan.emotionalTone || null,
    hook: plan.story.hook || null,
    cta: plan.story.cta || null,
    sceneLines: plan.scenes.map((s) => s.voiceScript).filter((line) => line.trim().length > 0),
  }
}
