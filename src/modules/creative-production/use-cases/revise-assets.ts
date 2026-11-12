import { AppError } from "@/core/http/errors"
import { applyScenePlanEdit } from "../domain/scene-plan-edit"
import { requireCapability } from "@/core/rbac/capabilities"
import { callCapability, type AdapterOutcome } from "@/core/ai/gateway"
import { aiGatewayDeps } from "@/core/ai/wiring"
import type { AiModelCandidate } from "@/core/ai/domain/routing"
import { createContentLLM } from "@/core/ai/adapters/multi-llm-provider"
import { providerOrderFor } from "@/modules/creative-production/use-cases/provider-preferences"
import type { TenantContext } from "@/core/tenancy"
import { GenerationJobRepository, getGenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository"
import { enqueueJob } from "@/modules/jobs/use-cases/enqueue-job"
import { refundJob } from "@/modules/usage/use-cases/refund-job"
import { aiFailureMessage } from "@/modules/usage/domain/ai-failure-message"
import { BrandProfileRepository, getBrandProfileRepository } from "@/modules/profiles/infra/brand-profile-repository"

import {
  createContentRewriteAdapter,
  createSceneReviseAdapter,
  type RewriteOutput,
} from "../adapters/revision-ai-adapter"
import type { PackageChannel } from "../domain/campaign-package-rules"
import {
  CONTENT_REWRITE_FEATURE,
  SCENE_REVISE_FEATURE,
  type SceneReviseInput,
} from "../domain/revision-rules"
import {
  parseStoredScenePlan,
  SCENE_PLAN_FEATURE,
  type ScenePlan,
  type ScenePlanScene,
} from "../domain/scene-plan-rules"

type Usage = { costCredit: number; balanceAfter: number | null }

/**
 * Một lượt AI chạy tại chỗ có sổ sách đầy đủ — cùng khuôn `generateScenePlan`:
 * `enqueueJob` (hạn mức, usage, idempotency) → cổng AI → ghi `output` → hỏng
 * thì `FAILED` + hoàn credit. Trùng khoá: trả lại kết quả cũ, không gọi mô hình.
 */
async function runInlineAiJob<O>(
  ctx: TenantContext,
  opts: {
    feature: string
    idempotencyKey: string
    payload: unknown
    capability: string
    entityType: string
    adapter: (model: AiModelCandidate) => Promise<AdapterOutcome<O>>
  }
): Promise<{ jobId: string; output: O; usage: Usage; deduped: boolean }> {
  const enq = await enqueueJob(ctx, {
    feature: opts.feature,
    payload: opts.payload,
    idempotencyKey: opts.idempotencyKey,
  })
  if (enq.deduped) {
    if (enq.job.status !== "COMPLETED" || !enq.job.output) {
      throw new AppError("CONFLICT", "Lượt sửa với khoá này đã chạy nhưng không có kết quả — bấm sửa lại")
    }
    return { jobId: enq.job.id, output: enq.job.output as O, usage: enq.usage, deduped: true }
  }
  const jobs = getGenerationJobRepository()
  await jobs.startInline(ctx, enq.job.id, new Date())
  try {
    const preferredModelKeys = await providerOrderFor(ctx, "content")
    const ai = await callCapability(
      { capability: opts.capability, privacy: "SHOP", entity: { type: opts.entityType, id: enq.job.id }, jobId: enq.job.id, preferredModelKeys },
      opts.adapter,
      aiGatewayDeps(ctx)
    )
    if (ai.kind !== "xong") throw new AppError("INTERNAL", "AI chưa chạy được lúc này — hãy thử lại sau ít phút")
    const output = ai.output as O
    await jobs.finishInline(ctx, enq.job.id, { ok: true, now: new Date(), output })
    return { jobId: enq.job.id, output, usage: enq.usage, deduped: false }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định"
    await jobs.finishInline(ctx, enq.job.id, { ok: false, error: message, now: new Date() })
    const refunded = (await refundJob(ctx, enq.job.id).catch(() => null))?.refunded === true
    throw new AppError("INTERNAL", aiFailureMessage("AI chưa sửa được", refunded))
  }
}

// ── (1) Sửa MỘT cảnh của kịch bản bối cảnh ────────────────────────────────

export async function reviseScene(
  ctx: TenantContext,
  input: {
    idempotencyKey: string
    instruction: string
    /** Job `creative.scene_plan` — có thì đọc cảnh từ kho và ghi lại kịch bản đã sửa. */
    scenePlanId?: string | null
    sceneIndex: number
    /** Chỉ dùng khi KHÔNG có `scenePlanId` (kịch bản cơ bản, không lưu ở máy chủ). */
    scene?: ScenePlanScene | null
    mode: "CREATIVE" | "AUTHENTIC"
    topicTitle: string
    productName: string
    colors: readonly string[]
  }
): Promise<{ jobId: string; scene: ScenePlanScene; usage: Usage; revision: number | null }> {
  requireCapability(ctx, "I1")

  let plan: ScenePlan | null = null
  let current: ScenePlanScene | null = input.scene ?? null
  const jobs = getGenerationJobRepository()
  if (input.scenePlanId) {
    const planJob = await jobs.findById(ctx, input.scenePlanId)
    if (!planJob || planJob.feature !== SCENE_PLAN_FEATURE) throw new AppError("NOT_FOUND", "Không có kịch bản này")
    plan = parseStoredScenePlan(planJob.output)
    current = plan?.scenes.find((s) => s.sceneIndex === input.sceneIndex) ?? null
  }
  if (!current) throw new AppError("NOT_FOUND", `Kịch bản không có cảnh ${input.sceneIndex}`)

  const brief: SceneReviseInput = {
    instruction: input.instruction,
    scene: current,
    mode: plan?.mode ?? input.mode,
    topicTitle: plan?.topicTitle ?? input.topicTitle,
    productName: input.productName,
    colors: input.colors,
  }
  const r = await runInlineAiJob<ScenePlanScene>(ctx, {
    feature: SCENE_REVISE_FEATURE,
    idempotencyKey: input.idempotencyKey,
    payload: { scene_plan_id: input.scenePlanId ?? null, scene_index: input.sceneIndex, instruction: input.instruction, before: current },
    capability: "video_storyboard",
    entityType: "scene_revise",
    adapter: createSceneReviseAdapter(createContentLLM(), brief, ctx.organizationId),
  })

  // Ghi cảnh đã sửa vào kịch bản đang dùng — C/D/E đọc lại đúng bản mới.
  if (plan && input.scenePlanId) {
    // v2: qua `applyScenePlanEdit` — cân lại thời lượng nếu lời thoại đổi, tăng `revision`.
    const edited = applyScenePlanEdit(plan, { replaceScene: r.output })
    const updated: ScenePlan = edited.ok ? edited.plan : { ...plan, revision: plan.revision + 1 }
    await jobs.replaceOutput(ctx, input.scenePlanId, SCENE_PLAN_FEATURE, updated)
    const saved = updated.scenes.find((s) => s.sceneIndex === input.sceneIndex) ?? r.output
    return { jobId: r.jobId, scene: saved, usage: r.usage, revision: updated.revision }
  }
  return { jobId: r.jobId, scene: r.output, usage: r.usage, revision: null as number | null }
}

// ── (2) AI viết lại MỘT bài đăng ──────────────────────────────────────────

export async function rewriteContent(
  ctx: TenantContext,
  input: {
    idempotencyKey: string
    channel: PackageChannel
    text: string
    hashtags: readonly string[]
    instruction: string
    productName: string
    topicTitle: string
    priceRange?: string | undefined
  }
): Promise<{ jobId: string; result: RewriteOutput; usage: Usage }> {
  requireCapability(ctx, "I1")
  const brand = await getBrandProfileRepository().current(ctx)
  const f = brand?.forbidden_styles
  const brandForbidden =
    typeof f === "string" ? f : Array.isArray(f) ? f.join(", ") : f ? JSON.stringify(f) : null

  const r = await runInlineAiJob<RewriteOutput>(ctx, {
    feature: CONTENT_REWRITE_FEATURE,
    idempotencyKey: input.idempotencyKey,
    payload: { channel: input.channel, instruction: input.instruction },
    capability: "content_generation",
    entityType: "content_rewrite",
    adapter: createContentRewriteAdapter(
      createContentLLM(),
      {
        channel: input.channel,
        text: input.text,
        hashtags: input.hashtags,
        instruction: input.instruction,
        productName: input.productName,
        topicTitle: input.topicTitle,
        priceRange: input.priceRange,
        brandForbidden,
        brandTone: brand?.tone_of_voice ?? null,
      },
      ctx.organizationId
    ),
  })
  return { jobId: r.jobId, result: r.output, usage: r.usage }
}
