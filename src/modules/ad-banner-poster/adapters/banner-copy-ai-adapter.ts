/**
 * Adapter AI sinh chữ banner (Công cụ 05) — cổng AI (`callCapability`, năng lực `content_generation`) gọi hàm này cho
 * từng mô hình nó chọn. Gọi LLM qua cổng `LLMProvider` (không SDK trực tiếp), kiểm JSON và ưu đãi tiệm TRƯỚC khi chấm
 * điểm. Không import Prisma. Audit API §33: trước đây use-case gọi `createContentLLM()` thẳng, ngoài cổng AI.
 */
import { z } from "zod"

import type { AiModelCandidate } from "@/core/ai/domain/routing"
import type { AdapterOutcome } from "@/core/ai/gateway"
import type { LLMProvider } from "@/core/ports/llm-provider"

import type { BannerCopyPayload } from "../domain/banner-types"
import { enforceShopPromotion } from "../domain/promotion-guard"

const BANNER_COPY_TIMEOUT_MS = 15_000

const copyResponseSchema = z.object({
  headline: z.string().min(2),
  subHeadline: z.string().min(3),
  promotionBadge: z.string(),
  ctaText: z.string().min(2),
  validityText: z.string().optional(),
})

export function createBannerCopyAdapter(llm: LLMProvider, input: { prompt: string; organizationId: string; shopPromotions: readonly string[] }) {
  return async (model: AiModelCandidate): Promise<AdapterOutcome<BannerCopyPayload>> => {
    const t0 = Date.now()
    try {
      const response = await llm.complete({ organizationId: input.organizationId, prompt: input.prompt, model: model.key, timeoutMs: BANNER_COPY_TIMEOUT_MS, maxTokens: 500 })
      const jsonMatch = response.text?.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return { ok: false, message: "Mô hình trả về không có JSON" }
      const parsed = copyResponseSchema.safeParse(JSON.parse(jsonMatch[0]))
      if (!parsed.success) return { ok: false, message: "Mô hình trả về thiếu trường chữ banner" }
      const copy = enforceShopPromotion({ ...parsed.data, validityText: parsed.data.validityText }, input.shopPromotions)
      // Tự hứa ưu đãi khi tiệm chưa khai → không dùng được (cùng luật với mẫu dựng sẵn).
      if (!copy) return { ok: false, message: "Mô hình tự đặt ưu đãi tiệm chưa khai" }
      const result: AdapterOutcome<BannerCopyPayload> = { ok: true, output: copy, scores: { factual: 1, brand: 1 }, latencyMs: Date.now() - t0 }
      if (response.costUsd !== undefined) Object.assign(result, { costUsd: response.costUsd })
      if (response.inputTokens !== undefined) Object.assign(result, { inputTokens: response.inputTokens })
      if (response.outputTokens !== undefined) Object.assign(result, { outputTokens: response.outputTokens })
      return result
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Lỗi không xác định" }
    }
  }
}
