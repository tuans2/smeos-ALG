/**
 * Chuỗi agent v1 (mục 4/5.1 kế hoạch, `AIC-37`→`AIC-23`→`AIC-24`→`AIC-23`):
 * Strategist → Writer (song song theo kênh) → Kiểm tất định → Critic → (nếu
 * cần) Rewriter tối đa `MAX_REWRITE_ROUNDS` vòng → Kiểm tất định lần hai →
 * ghi `content_generations`.
 *
 * Ba mức dự phòng, KHÔNG làm job treo hay FAILED vì một bước AI hỏng (mục 4):
 *   - Strategist hỏng  → Writer viết thẳng từ Brief (`strategy: null`).
 *   - Critic hỏng      → chỉ dùng kiểm tất định để quyết định viết lại,
 *                        không có điểm rubric (kênh đó không được tính vào
 *                        điểm tổng có trọng số).
 *   - Writer VÀ Rewriter đều hỏng cho một kênh → `buildFallbackPost()`
 *     (khuôn tất định), đánh dấu `needsReview:true`, `source:"template"`.
 *
 * Cùng khuôn `runInlineAiJob` của `revise-assets.ts`: `enqueueJob` → trùng
 * khoá thì trả job cũ → `startInline` → chạy tại chỗ (người dùng đang chờ) →
 * `finishInline` → hỏng toàn cục thì hoàn credit (`refundJob`) và `FAILED`.
 */

import { AppError } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { callCapability } from "@/core/ai/gateway"
import { aiGatewayDeps } from "@/core/ai/wiring"
import { createContentLLM } from "@/core/ai/adapters/multi-llm-provider"
import { providerOrderFor } from "@/modules/creative-production/use-cases/provider-preferences"
import type { LLMProvider } from "@/core/ports/llm-provider"
import type { TenantContext } from "@/core/tenancy"
import type { IGenerationJobRepository } from "@/modules/jobs/domain/repositories/generation-job-repository.interface"
import { getGenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository"
import { enqueueJob } from "@/modules/jobs/use-cases/enqueue-job"
import { refundJob } from "@/modules/usage/use-cases/refund-job"
import { aiFailureMessage } from "@/modules/usage/domain/ai-failure-message"

import type { PackageChannel } from "../../creative-production/domain/campaign-package-rules"
import {
  createCriticAdapter,
  createRewriterAdapter,
  createStrategistAdapter,
  createWriterAdapter,
} from "../adapters/content-engine-ai-adapter"
import type { ContentBrief } from "../contracts/brief"
import { runDeterministicChecks, type DeterministicCheckIssue } from "../domain/deterministic-checks"
import { buildFallbackPost } from "../domain/fallback-post"
import {
  CONTENT_GENERATE_FEATURE,
  MAX_REWRITE_ROUNDS,
  allChannelsFellBack,
  decideChannelRewrite,
  needsHumanReview,
  aggregateOverallScore,
} from "../domain/pipeline-rules"
import type { CriticOutput } from "../domain/prompts/critic/v1"
import { RUBRIC_VERSION, weightedScore, type RubricChannelKey } from "../domain/rubric"
import { getContentGenerationRepository, type content_generations } from "../infra/content-generation-repository"
import type { IContentGenerationRepository } from "../domain/repositories/content-generation-repository.interface"
import { getContentBrief } from "./get-content-brief"

const PROMPT_VERSIONS = { strategist: "v1", writer: "v1", critic: "v1", rewriter: "v1" } as const

export type ContentPostSource = "ai" | "rewritten" | "template"

export interface GeneratedChannelPost {
  readonly channel: PackageChannel
  readonly text: string
  readonly hashtags: readonly string[]
  readonly factIds: readonly string[]
  readonly source: ContentPostSource
  readonly needsReview: boolean
  readonly scores: Partial<Record<RubricChannelKey, number>> | null
  readonly issues: readonly string[]
}

export interface GenerateContentInput {
  readonly assetId?: string | null | undefined
  readonly productId?: string | null | undefined
  readonly analysisRunId?: string | null | undefined
  readonly topicId?: string | null | undefined
  readonly scenePlanId?: string | null | undefined
  readonly channels: readonly PackageChannel[]
  readonly idempotencyKey: string
  /** Lượt này đã được thu tiền ở job khác (Chặng 05, nợ #146) — xem `EnqueueJobInput.includedInJobId`. */
  readonly includedInJobId?: string | undefined
  /** Nhà cung cấp nội dung chọn cho lượt này (khoá `provider-catalog.ts`, loại `content`). */
  readonly contentProvider?: string | null | undefined
}

export interface ContentGenerationView {
  readonly jobId: string
  readonly generationId: string | null
  /** `PROCESSING` chỉ xảy ra khi gọi lại trùng `Idempotency-Key` lúc lượt đầu còn đang chạy. */
  readonly status: "COMPLETED" | "PROCESSING" | "FAILED"
  readonly posts: readonly GeneratedChannelPost[]
  readonly overallScore: number
  readonly needsReview: boolean
  readonly deduped: boolean
  readonly usage: { costCredit: number; balanceAfter: number | null }
}

function viewFromRecord(jobId: string, deduped: boolean, usage: ContentGenerationView["usage"], record: content_generations): ContentGenerationView {
  const posts = (record.posts as unknown as GeneratedChannelPost[]) ?? []
  return {
    jobId,
    generationId: record.id,
    status: "COMPLETED",
    posts,
    overallScore: record.overall_score ?? 0,
    needsReview: posts.some((p) => p.needsReview),
    deduped,
    usage,
  }
}

/**
 * Trạng thái trả về khi trùng `Idempotency-Key`. Lượt đầu còn đang chạy thì
 * báo `PROCESSING` (kèm `jobId` để theo dõi `GET /jobs/:id`) — trước đây mọi
 * trạng thái khác `COMPLETED` đều thành `FAILED`, nên client gọi lại vì hết
 * thời gian chờ nhận "hỏng" trong khi bài vẫn đang được viết.
 */
export function dedupedStatus(jobStatus: string): ContentGenerationView["status"] {
  if (jobStatus === "COMPLETED") return "COMPLETED"
  if (jobStatus === "PENDING" || jobStatus === "PROCESSING") return "PROCESSING"
  return "FAILED"
}

/** Một kênh: Writer → kiểm tất định → (nếu Critic hỏng) chỉ trả bài + issues để lượt sau quyết định. */
async function writeChannel(
  ctx: TenantContext,
  llm: LLMProvider,
  brief: ContentBrief,
  channel: PackageChannel,
  strategy: { channel: PackageChannel; angle: string; hooks: readonly string[]; outline: string; factIds: readonly string[]; cta: string } | null,
  jobId: string,
  preferredModelKeys: readonly string[]
): Promise<{ text: string; hashtags: readonly string[]; factIds: readonly string[]; source: ContentPostSource }> {
  const result = await callCapability(
    { capability: "content_generation", privacy: "SHOP", entity: { type: "content_generation", id: jobId }, jobId, preferredModelKeys },
    createWriterAdapter(llm, { brief, channel, strategy }, ctx.organizationId),
    aiGatewayDeps(ctx)
  )
  if (result.kind === "xong") {
    const o = result.output as { text: string; hashtags: readonly string[]; factIds: readonly string[] }
    return { ...o, source: "ai" }
  }
  // Writer hỏng cho kênh này — khuôn tất định tối thiểu (mục 4), không treo job.
  const fallback = buildFallbackPost(brief, channel)
  return { text: fallback.text, hashtags: fallback.hashtags, factIds: fallback.factIds, source: "template" }
}

/**
 * AI viết bài đa kênh cho MỘT chủ đề/sản phẩm (P27, quyết định PO 25/09/2026).
 */
export async function generateContent(
  ctx: TenantContext,
  input: GenerateContentInput,
  contentRepo: IContentGenerationRepository = getContentGenerationRepository(),
  jobRepo: IGenerationJobRepository = getGenerationJobRepository()
): Promise<ContentGenerationView> {
  requireCapability(ctx, "I1")

  if (input.channels.length === 0) throw new AppError("VALIDATION_FAILED", "Cần ít nhất một kênh")

  const enq = await enqueueJob(ctx, {
    feature: CONTENT_GENERATE_FEATURE,
    payload: {
      asset_id: input.assetId ?? null,
      product_id: input.productId ?? null,
      analysis_run_id: input.analysisRunId ?? null,
      topic_id: input.topicId ?? null,
      scene_plan_id: input.scenePlanId ?? null,
      channels: input.channels,
    },
    productId: input.productId ?? null,
    idempotencyKey: input.idempotencyKey,
    ...(input.includedInJobId ? { includedInJobId: input.includedInJobId } : {}),
  })

  if (enq.deduped) {
    const record = enq.job.output
      ? await contentRepo.findById(ctx, (enq.job.output as { generation_id?: string }).generation_id ?? "")
      : null
    if (record) return viewFromRecord(enq.job.id, true, enq.usage, record)
    return {
      jobId: enq.job.id,
      generationId: null,
      status: dedupedStatus(enq.job.status),
      posts: [],
      overallScore: 0,
      needsReview: false,
      deduped: true,
      usage: enq.usage,
    }
  }

  await jobRepo.startInline(ctx, enq.job.id, new Date())

  try {
    const brief = await getContentBrief(ctx, {
      assetId: input.assetId ?? null,
      productId: input.productId ?? null,
      analysisRunId: input.analysisRunId ?? null,
      topicId: input.topicId ?? null,
      scenePlanId: input.scenePlanId ?? null,
      channels: input.channels,
    })
    // Nhiều nhà cung cấp tương đương (PO 25/09/2026): thứ tự = bên chọn cho lượt
    // này → thứ tự của tiệm → mặc định; cổng AI tự chuyển bên khi một bên hỏng.
    const llm = createContentLLM()
    const preferredModelKeys = await providerOrderFor(ctx, "content", input.contentProvider)
    const hasStory = brief.story !== null && brief.story !== undefined

    // Sự kiện tiến độ (`job_events`, mục 4 kế hoạch) — cùng cơ chế
    // `_set_stage()` của worker Python: cập nhật `generation_jobs.stage` +
    // ghi một dòng `job_events` để `GET /jobs/:id/events` (SSE) phát lại
    // từng bước cho giao diện. Chuỗi chạy inline (giống `generateScenePlan`)
    // nên đây là tiến độ THẬT của cùng một request, không phải mô phỏng.
    // 1) Strategist — hỏng thì Writer viết thẳng từ brief (strategy: null).
    await jobRepo.setStage(ctx, enq.job.id, "STRATEGIST")
    const strategistResult = await callCapability(
      { capability: "content_strategy", privacy: "SHOP", entity: { type: "content_generation", id: enq.job.id }, jobId: enq.job.id, preferredModelKeys },
      createStrategistAdapter(llm, brief, input.channels, ctx.organizationId),
      aiGatewayDeps(ctx)
    )
    const strategy = strategistResult.kind === "xong" ? strategistResult.output : null

    // 2) Writer — song song theo kênh.
    await jobRepo.setStage(ctx, enq.job.id, "WRITER")
    const writerOutputs = await Promise.all(
      input.channels.map(async (channel) => {
        const channelStrategy = strategy?.channels.find((c) => c.channel === channel) ?? null
        const written = await writeChannel(ctx, llm, brief, channel, channelStrategy, enq.job.id, preferredModelKeys)
        return { channel, ...written }
      })
    )

    // 3) Kiểm tất định (trước Critic — không tốn lượt mô hình cho lỗi máy bắt được).
    const deterministicByChannel = new Map<PackageChannel, readonly DeterministicCheckIssue[]>()
    for (const w of writerOutputs) {
      deterministicByChannel.set(w.channel, runDeterministicChecks({ text: w.text, hashtags: w.hashtags, channel: w.channel, brief }).issues)
    }

    // 4) Critic — MỘT lượt cho tất cả kênh. Hỏng thì chỉ dùng kiểm tất định.
    await jobRepo.setStage(ctx, enq.job.id, "CRITIC")
    const criticResult = await callCapability(
      { capability: "content_qa", privacy: "SHOP", entity: { type: "content_generation", id: enq.job.id }, jobId: enq.job.id, preferredModelKeys },
      createCriticAdapter(
        llm,
        brief,
        writerOutputs.map((w) => ({ channel: w.channel, text: w.text, hashtags: w.hashtags })),
        ctx.organizationId
      ),
      aiGatewayDeps(ctx)
    )
    const critic: CriticOutput | null = criticResult.kind === "xong" ? criticResult.output : null

    // 5) Quyết định viết lại từng kênh + (nếu cần) chạy Rewriter tối đa MAX_REWRITE_ROUNDS vòng.
    // Nhãn "REWRITER" chỉ ghi MỘT LẦN, đúng lúc kênh đầu tiên thật sự cần
    // viết lại — không ghi nếu không kênh nào trượt (đa số lượt chạy).
    let rewriterStageEmitted = false
    const finalPosts: GeneratedChannelPost[] = []
    for (const w of writerOutputs) {
      const deterministicIssues = deterministicByChannel.get(w.channel) ?? []
      const criticChannel = critic?.channels.find((c) => c.channel === w.channel) ?? null

      if (w.source === "template") {
        // Writer đã hỏng hẳn cho kênh này — khuôn tất định, không viết lại nữa.
        finalPosts.push({
          channel: w.channel,
          text: w.text,
          hashtags: w.hashtags,
          factIds: w.factIds,
          source: "template",
          needsReview: true,
          scores: null,
          issues: deterministicIssues.map((i) => i.message),
        })
        continue
      }

      const decision = critic
        ? decideChannelRewrite({ deterministicIssues, criticScores: criticChannel?.scores ?? {}, hasStory })
        : { needsRewrite: deterministicIssues.some((i) => i.severity === "REJECTED"), overallScore: 0, reasons: deterministicIssues.map((i) => i.message) }

      let text = w.text
      let hashtags = w.hashtags
      let factIds = w.factIds
      let source: ContentPostSource = w.source
      let finalDeterministicIssues = deterministicIssues
      let roundsUsed = 0

      if (decision.needsRewrite && roundsUsed < MAX_REWRITE_ROUNDS) {
        roundsUsed += 1
        if (!rewriterStageEmitted) {
          rewriterStageEmitted = true
          await jobRepo.setStage(ctx, enq.job.id, "REWRITER")
        }
        const rewriteResult = await callCapability(
          { capability: "content_generation", privacy: "SHOP", entity: { type: "content_generation", id: enq.job.id }, jobId: enq.job.id, preferredModelKeys },
          createRewriterAdapter(
            llm,
            {
              brief,
              channel: w.channel,
              previousText: text,
              previousHashtags: hashtags,
              issues: decision.reasons,
              fixInstructions: criticChannel?.fixInstructions ?? "",
            },
            ctx.organizationId
          ),
          aiGatewayDeps(ctx)
        )
        if (rewriteResult.kind === "xong") {
          const o = rewriteResult.output as { text: string; hashtags: readonly string[]; factIds: readonly string[] }
          text = o.text
          hashtags = o.hashtags
          factIds = o.factIds
          source = "rewritten"
          finalDeterministicIssues = runDeterministicChecks({ text, hashtags, channel: w.channel, brief }).issues
        }
        // Rewriter hỏng: giữ nguyên bài cũ, needsHumanReview() bên dưới sẽ đánh dấu cần soát.
      }

      const stillRejected = finalDeterministicIssues.some((i) => i.severity === "REJECTED")
      const reviewNeeded = needsHumanReview({ ...decision, needsRewrite: decision.needsRewrite || stillRejected }, roundsUsed)

      finalPosts.push({
        channel: w.channel,
        text,
        hashtags,
        factIds,
        source,
        needsReview: reviewNeeded,
        scores: criticChannel?.scores ?? null,
        issues: finalDeterministicIssues.map((i) => i.message),
      })
    }

    // Điểm tổng chỉ tính các kênh đã có điểm Critic thật (mục 5 pipeline-rules:
    // "không tính kênh lỗi cứng") — kênh dùng khuôn tất định (`template`) hoặc
    // Critic hỏng hoàn toàn (không có `scores`) bị loại khỏi trung bình.
    const scoredForAverage = finalPosts.filter((p) => p.source !== "template" && p.scores !== null)
    const overallScore = aggregateOverallScore(scoredForAverage.map((p) => weightedScore(p.scores ?? {}, hasStory)))

    const generation = await contentRepo.create(ctx, {
      jobId: enq.job.id,
      origin: "content_engine_ui",
      assetId: input.assetId ?? null,
      productId: input.productId ?? null,
      topicId: input.topicId ?? null,
      scenePlanId: input.scenePlanId ?? null,
      mode: brief.story?.mode ?? null,
      channels: input.channels,
      brief: brief as unknown,
      briefVersion: brief.briefVersion,
      promptVersions: PROMPT_VERSIONS,
      rubricVersion: RUBRIC_VERSION,
      strategy: strategy ?? undefined,
      posts: finalPosts as unknown,
      overallScore,
      createdBy: ctx.userId,
    })

    // Writer hỏng ở MỌI kênh = nhà cung cấp AI không viết được gì. Vẫn giao
    // khuôn tất định (mục 4 kế hoạch: không FAILED), nhưng KHÔNG thu credit
    // cho bài AI không viết: `result=REJECTED` là diện hoàn của
    // `refund-policy.ts` (COMPLETED + REJECTED không phải FAILED).
    const aiUnavailable = allChannelsFellBack(finalPosts.map((p) => p.source))
    await jobRepo.finishInline(ctx, enq.job.id, {
      ok: true,
      now: new Date(),
      output: { generation_id: generation.id },
      ...(aiUnavailable ? { result: "REJECTED" } : {}),
    })
    const refund = aiUnavailable ? await refundJob(ctx, enq.job.id).catch(() => null) : null
    const usage = refund?.refunded ? { costCredit: 0, balanceAfter: null } : enq.usage

    return {
      jobId: enq.job.id,
      generationId: generation.id,
      status: "COMPLETED",
      posts: finalPosts,
      overallScore,
      needsReview: finalPosts.some((p) => p.needsReview),
      deduped: false,
      usage,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định"
    await jobRepo.finishInline(ctx, enq.job.id, { ok: false, error: message, now: new Date() })
    throw new AppError("INTERNAL", aiFailureMessage("AI chưa viết được bài", (await refundJob(ctx, enq.job.id).catch(() => null))?.refunded === true))
  }
}
