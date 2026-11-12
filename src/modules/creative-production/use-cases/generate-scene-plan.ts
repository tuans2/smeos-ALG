import { AppError } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { callCapability } from "@/core/ai/gateway"
import { aiGatewayDeps } from "@/core/ai/wiring"
import { createContentLLM } from "@/core/ai/adapters/multi-llm-provider"
import { providerOrderFor } from "@/modules/creative-production/use-cases/provider-preferences"
import type { TenantContext } from "@/core/tenancy"
import { GenerationJobRepository, getGenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository"
import { enqueueJob } from "@/modules/jobs/use-cases/enqueue-job"
import { refundJob } from "@/modules/usage/use-cases/refund-job"
import { aiFailureMessage } from "@/modules/usage/domain/ai-failure-message"
import { refundPartial } from "@/modules/usage/use-cases/refund-partial"
import { lyDoHoanCredit } from "@/modules/usage/domain/refund-policy"
import { costCreditForFeature } from "@/modules/usage/domain/pricing"
import { CONTENT_GENERATE_FEATURE } from "@/modules/content-engine/domain/pipeline-rules"

import { createScenePlanAdapter } from "../adapters/scene-plan-ai-adapter"
import { applyScenePlanEdit, type ScenePlanEdit } from "../domain/scene-plan-edit"
import {
  parseStoredScenePlan,
  SCENE_PLAN_FEATURE,
  type ScenePlan,
  type ScenePlanInput,
} from "../domain/scene-plan-rules"
import { resolvePublishing } from "../domain/publishing-rules"
import { generateContent } from "@/modules/content-engine/use-cases/generate-content"

export type ScenePlanJobView = {
  jobId: string
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED"
  error: string | null
  plan: ScenePlan | null
}

export type ScenePlanResult = ScenePlanJobView & {
  deduped: boolean
  usage: { costCredit: number; balanceAfter: number | null }
}

function view(job: {
  id: string
  status: string
  error: string | null
  output: unknown
}): ScenePlanJobView {
  return {
    jobId: job.id,
    status: job.status as ScenePlanJobView["status"],
    error: job.error,
    plan: job.status === "COMPLETED" ? parseStoredScenePlan(job.output) : null,
  }
}

/**
 * AI viết kịch bản bối cảnh cho MỘT chủ đề (quyết định PO 24/09/2026).
 *
 * Cùng khuôn với `generateProductCopy`: `enqueueJob` (hạn mức, usage, khoá
 * idempotency trong một giao dịch) → chạy tại chỗ qua cổng AI (lượt viết mất
 * vài giây, người dùng đang chờ trên màn hình) → ghi kịch bản vào
 * `generation_jobs.output`. Hỏng thì `FAILED` và hoàn credit (D3-b).
 *
 * Trùng khoá: trả lại đúng job cũ, không gọi mô hình, không trừ credit.
 */
export async function generateScenePlan(
  ctx: TenantContext,
  input: {
    brief: ScenePlanInput
    idempotencyKey: string
    productId?: string | null
    assetId?: string | null
    /** Nhà cung cấp nội dung chọn cho lượt này (khoá `provider-catalog.ts`, loại `content`). */
    contentProvider?: string | null
  }
): Promise<ScenePlanResult> {
  requireCapability(ctx, "I1")

  // Một lần bấm = một lần thu (nợ #146, 25/09/2026): kịch bản + bài viết các
  // kênh đã chọn thu GỘP trên job kịch bản; job Content Engine đi kèm chạy
  // với `includedInJobId` (0 credit, không tiêu lượt dùng thử). Bước viết bài
  // hỏng → hoàn đúng phần của bài viết (`refundPartial`).
  const postChannels = resolvePublishing(input.brief.platforms, input.brief.outputs).postChannels
  const contentCredit = postChannels.length > 0 ? costCreditForFeature(CONTENT_GENERATE_FEATURE) : 0

  const enq = await enqueueJob(ctx, {
    feature: SCENE_PLAN_FEATURE,
    costCredit: costCreditForFeature(SCENE_PLAN_FEATURE) + contentCredit,
    payload: {
      topic_id: input.brief.topic.id,
      topic_title: input.brief.topic.title,
      mode: input.brief.mode,
      asset_id: input.assetId ?? null,
      platforms: input.brief.platforms ?? null,
      outputs: input.brief.outputs ?? null,
    },
    productId: input.productId ?? null,
    idempotencyKey: input.idempotencyKey,
  })

  if (enq.deduped) {
    return { ...view(enq.job), deduped: true, usage: enq.usage }
  }

  const jobRepo = getGenerationJobRepository()
  await jobRepo.startInline(ctx, enq.job.id, new Date())
  const preferredModelKeys = await providerOrderFor(ctx, "content", input.contentProvider)

  try {
    const aiResult = await callCapability(
      {
        capability: "video_storyboard",
        privacy: "SHOP",
        entity: { type: "scene_plan", id: enq.job.id },
        jobId: enq.job.id,
        preferredModelKeys,
      },
      createScenePlanAdapter(createContentLLM(), input.brief, ctx.organizationId),
      aiGatewayDeps(ctx)
    )
    if (aiResult.kind !== "xong") {
      throw new AppError("INTERNAL", "AI chưa chạy được lúc này — hãy thử lại sau ít phút")
    }
    const plan = aiResult.output as ScenePlan
    await jobRepo.finishInline(ctx, enq.job.id, { ok: true, now: new Date(), output: plan })

    // Bước làm giàu THỨ HAI, không phải thành phần chính (P27): kịch bản đã
    // ghi xong ở trên — gọi tiếp Content Engine viết bài cho các kênh đã chọn
    // (Chặng 05 không tự viết bài, xem `scene-plan-rules.ts#buildScenePlanPrompt`).
    // Hỏng ở đây KHÔNG làm hỏng kịch bản; chỉ hoàn phần tiền của bài viết.
    let usage = enq.usage
    if (postChannels.length > 0) {
      const content = await generateContent(ctx, {
        scenePlanId: enq.job.id,
        assetId: input.assetId ?? null,
        productId: input.productId ?? null,
        topicId: input.brief.topic.id,
        channels: postChannels,
        idempotencyKey: `content-engine:scene-plan:${enq.job.id}`,
        includedInJobId: enq.job.id,
        contentProvider: input.contentProvider ?? null,
      }).catch(() => null)
      const contentJob = content ? await jobRepo.findById(ctx, content.jobId) : null
      const contentDelivered = contentJob !== null && lyDoHoanCredit(contentJob) === null
      if (!contentDelivered) {
        const { refunded } = await refundPartial(ctx, enq.job.id, "goi-noi-dung-hong", contentCredit).catch(() => ({
          refunded: 0,
        }))
        if (refunded > 0) {
          usage = {
            costCredit: usage.costCredit - refunded,
            balanceAfter: usage.balanceAfter === null ? null : usage.balanceAfter + refunded,
          }
        }
      }
    }

    return {
      jobId: enq.job.id,
      status: "COMPLETED",
      error: null,
      plan,
      deduped: false,
      usage,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định"
    await jobRepo.finishInline(ctx, enq.job.id, { ok: false, error: message, now: new Date() })
    const refunded = (await refundJob(ctx, enq.job.id).catch(() => null))?.refunded === true
    throw new AppError("INTERNAL", aiFailureMessage("AI chưa viết được kịch bản bối cảnh", refunded))
  }
}

/** `GET /scene-plans/:id` — chỉ job `creative.scene_plan` của đúng tổ chức. */
export async function getScenePlan(ctx: TenantContext, jobId: string): Promise<ScenePlanJobView> {
  requireCapability(ctx, "I1")
  const job = await getGenerationJobRepository().findById(ctx, jobId)
  if (!job || job.feature !== SCENE_PLAN_FEATURE) throw new AppError("NOT_FOUND", "Không có kịch bản này")
  return view(job)
}

/**
 * Tra kịch bản theo khoá idempotency mà KHÔNG tạo job — Khu vực C/D mở ra thì
 * dùng lại kịch bản đã có; chưa có thì người dùng tự bấm viết (không tự trừ credit).
 */
export async function findScenePlanByKey(
  ctx: TenantContext,
  idempotencyKey: string
): Promise<ScenePlanJobView | null> {
  requireCapability(ctx, "I1")
  const job = await getGenerationJobRepository().findByIdempotencyKey(ctx, SCENE_PLAN_FEATURE, idempotencyKey)
  return job ? view(job) : null
}

/**
 * `PATCH /scene-plans/:id` (v2, 24/09/2026) — sửa kịch bản sản xuất tổng tại
 * chỗ (nền tảng đăng, thời lượng / lời thoại / phụ đề / chuyển cảnh từng cảnh,
 * âm thanh, video, bài đăng). Miễn phí; tăng `revision`.
 */
export async function updateScenePlan(ctx: TenantContext, jobId: string, edit: ScenePlanEdit): Promise<ScenePlanJobView> {
  requireCapability(ctx, "I1")
  const jobs = getGenerationJobRepository()
  const job = await jobs.findById(ctx, jobId)
  if (!job || job.feature !== SCENE_PLAN_FEATURE) throw new AppError("NOT_FOUND", "Không có kịch bản này")
  const plan = job.status === "COMPLETED" ? parseStoredScenePlan(job.output) : null
  if (!plan) throw new AppError("CONFLICT", "Kịch bản chưa sẵn sàng để sửa")
  const r = applyScenePlanEdit(plan, edit)
  if (!r.ok) throw new AppError("VALIDATION_FAILED", r.reason)
  const saved = await jobs.replaceOutput(ctx, jobId, SCENE_PLAN_FEATURE, r.plan)
  if (!saved) throw new AppError("CONFLICT", "Không ghi được kịch bản")
  return { jobId, status: "COMPLETED", error: null, plan: r.plan }
}
