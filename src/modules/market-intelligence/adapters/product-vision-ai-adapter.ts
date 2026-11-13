import type { AdapterRun } from "@/core/ai/gateway"
import { extractJsonText } from "@/core/ai/adapters/llm-json"
import type { LLMProvider } from "@/core/ports/llm-provider"

import {
  getProductVisionSystemPrompt,
  parseProductVisionJson,
  PRODUCT_VISION_SYSTEM_PROMPT,
  productVisionUserText,
  type VisionExtractionResult,
} from "./product-vision-prompt"
import type { IndustryPluginContract } from "@/modules/organization/domain/industry-plugin-contract"

/** 60 giây: một ảnh + ~1.500 token JSON. Hết hạn thì cổng AI chuyển nhà cung cấp kế tiếp. */
const VISION_TIMEOUT_MS = 60_000

/**
 * Adapter của Chặng 02 cho cổng AI (`product_vision`, nợ #155 — 25/09/2026).
 * Cổng AI chọn mô hình theo thứ tự ưu tiên của tiệm (OpenAI / Claude / Gemini
 * — mọi bên đều đọc ảnh); adapter chỉ gọi đúng mô hình được giao và đọc JSON.
 */
export function createProductVisionAdapter(
  llm: LLMProvider,
  input: {
    image: { mimeType: string; base64: string }
    productTitle?: string | undefined
    industryPlugin?: IndustryPluginContract | undefined
  },
  organizationId: string
): AdapterRun<VisionExtractionResult> {
  return async (model) => {
    const batDau = Date.now()
    try {
      const systemPrompt = input.industryPlugin
        ? getProductVisionSystemPrompt(input.industryPlugin)
        : PRODUCT_VISION_SYSTEM_PROMPT
      const userPrompt = productVisionUserText(input.productTitle, input.industryPlugin)

      const res = await llm.complete({
        organizationId,
        model: model.key,
        system: systemPrompt,
        prompt: userPrompt,
        images: [input.image],
        jsonSchema: { type: "object" },
        maxTokens: 1500,
        timeoutMs: VISION_TIMEOUT_MS,
      })
      const output = parseProductVisionJson(extractJsonText(res.text), input.productTitle, input.industryPlugin)
      if (!output) return { ok: false, message: "Mô hình không trả JSON đọc được hoặc không có thành phần sản phẩm" }
      return {
        ok: true,
        output,
        latencyMs: Date.now() - batDau,
        imageCount: 1,
        ...(res.costUsd !== undefined ? { costUsd: res.costUsd } : {}),
        ...(res.inputTokens !== undefined ? { inputTokens: res.inputTokens } : {}),
        ...(res.outputTokens !== undefined ? { outputTokens: res.outputTokens } : {}),
      }
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Lỗi gọi mô hình" }
    }
  }
}
