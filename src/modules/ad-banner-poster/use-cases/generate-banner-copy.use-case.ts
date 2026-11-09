/**
 * generate-banner-copy.use-case.ts — Use-case sinh nội dung quảng cáo thông minh cho Công cụ 05.
 * Gọi AI qua cổng `callCapability` (năng lực `content_generation`) và tự động Fallback về Instant Template.
 *
 * Audit API §33 (09/11/2026): trước đây gọi `createContentLLM().complete()` thẳng với `organizationId: "system"` —
 * ngoài cổng AI nên bỏ qua trần mô hình, sàn quyền riêng tư, sổ `ai_requests` của tổ chức.
 */
import { createContentLLM } from "@/core/ai/adapters/multi-llm-provider"
import { callCapability, type AiGatewayDeps } from "@/core/ai/gateway"
import { aiGatewayDeps } from "@/core/ai/wiring"
import type { LLMProvider } from "@/core/ports/llm-provider"
import type { TenantContext } from "@/core/tenancy"
import { createBannerCopyAdapter } from "../adapters/banner-copy-ai-adapter"
import type { BannerCopyPayload } from "../domain/banner-types"
import { buildBannerCopyPrompt } from "../domain/prompt-builder"
import { generateInstantBannerCopy } from "../domain/banner-template-generator"
import { shopPromotionBadge } from "../domain/promotion-guard"

export interface GenerateBannerCopyInput {
  readonly industryKey: string
  readonly occasionKey: string
  readonly occasionLabel: string
  readonly shopName: string
  readonly productTitle?: string | undefined
  readonly desiredPromotion?: string | undefined
  /** Ưu đãi tiệm đang bật (Hồ sơ tiệm) — nguồn duy nhất cho nhãn ưu đãi */
  readonly shopPromotions: readonly string[]
}

export interface GenerateBannerCopyOutput {
  readonly copy: BannerCopyPayload
  readonly source: "AI_CONTENT_ENGINE" | "INSTANT_TEMPLATE"
}

/** Không có `ctx` (test, gọi ngoài tổ chức) → chỉ dùng mẫu dựng sẵn, không gọi AI. */
export interface BannerCopyAi {
  readonly ctx: TenantContext
  readonly llm?: LLMProvider | undefined
  readonly deps?: AiGatewayDeps | undefined
}

export async function generateBannerCopyUseCase(
  input: GenerateBannerCopyInput,
  ai?: BannerCopyAi
): Promise<GenerateBannerCopyOutput> {
  if (ai) {
    const prompt = buildBannerCopyPrompt({
      industryKey: input.industryKey,
      occasionLabel: input.occasionLabel,
      shopName: input.shopName,
      productTitle: input.productTitle,
      shopPromotions: input.shopPromotions,
    })
    try {
      const result = await callCapability(
        { capability: "content_generation", privacy: "SHOP", source: "CORE", jobId: null },
        createBannerCopyAdapter(ai.llm ?? createContentLLM(), { prompt, organizationId: ai.ctx.organizationId, shopPromotions: input.shopPromotions }),
        ai.deps ?? aiGatewayDeps(ai.ctx)
      )
      if (result.kind === "xong") return { copy: result.output, source: "AI_CONTENT_ENGINE" }
    } catch {
      // Cổng AI lỗi (chưa cấu hình mô hình, CSDL…) → mẫu dựng sẵn
    }
  }

  // Fallback an toàn về Instant Template
  const fallbackCopy = generateInstantBannerCopy({
    occasionKey: input.occasionKey,
    shopName: input.shopName,
    productTitle: input.productTitle,
    suggestedPromotion: shopPromotionBadge(input.shopPromotions, input.desiredPromotion),
  })

  return {
    copy: fallbackCopy,
    source: "INSTANT_TEMPLATE",
  }
}
