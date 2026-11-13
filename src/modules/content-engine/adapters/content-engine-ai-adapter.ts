/**
 * Adapter nối bốn agent (Strategist/Writer/Critic/Rewriter) vào cổng AI
 * (`callCapability`, mục 3/5.1 kế hoạch). Mỗi hàm `create*Adapter` trả về
 * một `AdapterRun<O>` — cổng quyết định chạy với mô hình nào, adapter chỉ
 * biết cách gọi `LLMProvider` rồi chuẩn hoá JSON trả về (giống
 * `revision-ai-adapter.ts` của Chặng 07).
 *
 * `scores` trả cho cổng là điểm "cuộc gọi có ra được kết quả dùng được
 * không" (để cổng quyết định escalate/fallback mô hình) — KHÔNG phải điểm
 * rubric thật của bài viết. Điểm rubric thật (`RUBRIC_V1`) nằm trong chính
 * `output.channels[].scores` mà Critic trả ra, đọc bởi `pipeline-rules.ts`.
 *
 * Thuần TypeScript, không import Prisma — nhưng CÓ gọi mạng qua `LLMProvider`
 * nên không đặt trong `domain/`.
 */

import type { AiModelCandidate } from "@/core/ai/domain/routing"
import { checkFlowerContent } from "@/core/ai/domain/flower-content-guard"
import type { AdapterOutcome } from "@/core/ai/gateway"
import type { LLMProvider, LLMResponse } from "@/core/ports/llm-provider"

import type { PackageChannel } from "../../creative-production/domain/campaign-package-rules"
import type { ContentBrief } from "../contracts/brief"
import { AGENT_CALL_TIMEOUT_MS } from "../domain/pipeline-rules"
import type { CriticOutput, CriticPostToReview } from "../domain/prompts/critic/v1"
import { CRITIC_PROMPT_V1 } from "../domain/prompts/critic/v1"
import type { RewriterPromptInput } from "../domain/prompts/rewriter/v1"
import { REWRITER_PROMPT_V1 } from "../domain/prompts/rewriter/v1"
import type { ContentStrategy } from "../domain/prompts/strategist/v1"
import { STRATEGIST_PROMPT_V1 } from "../domain/prompts/strategist/v1"
import type { WriterOutput, WriterPromptInput } from "../domain/prompts/writer/v1"
import { WRITER_PROMPT_V1 } from "../domain/prompts/writer/v1"

function withUsage<T>(result: AdapterOutcome<T>, response: LLMResponse): AdapterOutcome<T> {
  if (response.costUsd !== undefined) Object.assign(result, { costUsd: response.costUsd })
  if (response.inputTokens !== undefined) Object.assign(result, { inputTokens: response.inputTokens })
  if (response.outputTokens !== undefined) Object.assign(result, { outputTokens: response.outputTokens })
  return result
}

function parse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    throw new Error("Mô hình trả về không phải JSON hợp lệ")
  }
}

/** Điểm "brand" thô cho cổng — 1 nếu văn bản không phạm từ cấm, 0.7 nếu có cảnh báo. Không thay Critic. */
function roughBrandScore(text: string, forbiddenStyles: readonly string[]): number {
  const check = checkFlowerContent(text, { brandForbiddenStyles: forbiddenStyles.join(", ") })
  return check.warnings.length === 0 ? 1 : 0.7
}

// ============================================================
// Strategist (AIC-37 content_strategy)
// ============================================================

export function createStrategistAdapter(llm: LLMProvider, brief: ContentBrief, channels: readonly PackageChannel[], organizationId: string) {
  return async (model: AiModelCandidate): Promise<AdapterOutcome<ContentStrategy>> => {
    const t0 = Date.now()
    try {
      const response = await llm.complete({
        organizationId,
        prompt: STRATEGIST_PROMPT_V1.build(brief, channels),
        model: model.key,
        timeoutMs: AGENT_CALL_TIMEOUT_MS,
        jsonSchema: STRATEGIST_PROMPT_V1.jsonSchema(),
        maxTokens: 1800,
      })
      const r = STRATEGIST_PROMPT_V1.normalize(parse(response.text), channels)
      if (!r.ok) throw new Error(r.reason)
      return withUsage({ ok: true, output: r.strategy, scores: { factual: 1, brand: 1 }, latencyMs: Date.now() - t0 }, response)
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Lỗi không xác định" }
    }
  }
}

// ============================================================
// Writer (AIC-23 content_generation)
// ============================================================

export function createWriterAdapter(llm: LLMProvider, input: WriterPromptInput, organizationId: string) {
  return async (model: AiModelCandidate): Promise<AdapterOutcome<WriterOutput>> => {
    const t0 = Date.now()
    try {
      const response = await llm.complete({
        organizationId,
        prompt: WRITER_PROMPT_V1.build(input),
        model: model.key,
        timeoutMs: AGENT_CALL_TIMEOUT_MS,
        jsonSchema: WRITER_PROMPT_V1.jsonSchema(),
        maxTokens: 1200,
      })
      const r = WRITER_PROMPT_V1.normalize(parse(response.text), input.channel)
      if (!r.ok) throw new Error(r.reason)
      return withUsage(
        {
          ok: true,
          output: r.output,
          scores: {
            factual: 1,
            brand: roughBrandScore(r.output.text, input.brief.rules.forbiddenStyles),
            platform: 1,
            readability: 1,
          },
          latencyMs: Date.now() - t0,
        },
        response
      )
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Lỗi không xác định" }
    }
  }
}

// ============================================================
// Critic (AIC-24 content_qa)
// ============================================================

export function createCriticAdapter(
  llm: LLMProvider,
  brief: ContentBrief,
  posts: readonly CriticPostToReview[],
  organizationId: string
) {
  return async (model: AiModelCandidate): Promise<AdapterOutcome<CriticOutput>> => {
    const t0 = Date.now()
    try {
      const expectedChannels = posts.map((p) => p.channel)
      const response = await llm.complete({
        organizationId,
        prompt: CRITIC_PROMPT_V1.build(brief, posts),
        model: model.key,
        timeoutMs: AGENT_CALL_TIMEOUT_MS,
        jsonSchema: CRITIC_PROMPT_V1.jsonSchema(),
        maxTokens: 2000,
      })
      const r = CRITIC_PROMPT_V1.normalize(parse(response.text), expectedChannels)
      if (!r.ok) throw new Error(r.reason)
      const hasStory = brief.story !== null && brief.story !== undefined
      const scores: Record<string, number> = { factual: 1, brand: 1, platform: 1 }
      if (hasStory) scores.story = 1
      return withUsage({ ok: true, output: r.output, scores, latencyMs: Date.now() - t0 }, response)
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Lỗi không xác định" }
    }
  }
}

// ============================================================
// Rewriter (AIC-23 content_generation — dùng lại năng lực Writer)
// ============================================================

export function createRewriterAdapter(llm: LLMProvider, input: RewriterPromptInput, organizationId: string) {
  return async (model: AiModelCandidate): Promise<AdapterOutcome<WriterOutput>> => {
    const t0 = Date.now()
    try {
      const response = await llm.complete({
        organizationId,
        prompt: REWRITER_PROMPT_V1.build(input),
        model: model.key,
        timeoutMs: AGENT_CALL_TIMEOUT_MS,
        jsonSchema: REWRITER_PROMPT_V1.jsonSchema(),
        maxTokens: 1200,
      })
      const r = REWRITER_PROMPT_V1.normalize(parse(response.text), input.channel)
      if (!r.ok) throw new Error(r.reason)
      return withUsage(
        {
          ok: true,
          output: r.output,
          scores: {
            factual: 1,
            brand: roughBrandScore(r.output.text, input.brief.rules.forbiddenStyles),
            platform: 1,
            readability: 1,
          },
          latencyMs: Date.now() - t0,
        },
        response
      )
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Lỗi không xác định" }
    }
  }
}
