/**
 * Nối prompt khẩu hiệu Bộ nhận diện (`ACTIVE_PROMPTS.brandIdentity`) vào cổng AI (`callCapability`).
 * Gọi mô hình qua cổng LLMProvider — không import SDK nhà cung cấp. Điểm `brand` hạ khi khẩu hiệu dính
 * cụm sáo rỗng hoặc lời hứa chưa khai, để cổng AI tự chuyển mô hình kế.
 */
import type { AiModelCandidate } from "@/core/ai/domain/routing"
import type { AdapterOutcome } from "@/core/ai/gateway"
import type { LLMProvider } from "@/core/ports/llm-provider"
import { ACTIVE_PROMPTS } from "@/modules/content-engine/domain/prompts/active"
import type { BrandIdentityLine, BrandIdentityPromptInput } from "@/modules/content-engine/domain/prompts/brand-identity/v1"
import { findCliches, findUndeclaredPromises } from "@/modules/content-engine/domain/landing-copy-guard"

const TIMEOUT_MS = 20_000

function parseJson(text: string): unknown {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  return JSON.parse(match ? match[1]! : text)
}

export function createBrandIdentityAdapter(llm: LLMProvider, input: BrandIdentityPromptInput, organizationId: string) {
  return async (model: AiModelCandidate): Promise<AdapterOutcome<BrandIdentityLine[]>> => {
    const t0 = Date.now()
    try {
      const response = await llm.complete({
        organizationId,
        prompt: ACTIVE_PROMPTS.brandIdentity.build(input),
        model: model.key,
        timeoutMs: TIMEOUT_MS,
        jsonSchema: ACTIVE_PROMPTS.brandIdentity.jsonSchema(),
        maxTokens: 800,
      })
      const r = ACTIVE_PROMPTS.brandIdentity.normalize(parseJson(response.text))
      if (!r.ok) throw new Error(r.reason)
      const bad = r.output.filter((l) => findCliches(l.slogan).length > 0 || findUndeclaredPromises(l.slogan).length > 0).length
      const brand = 1 - bad / r.output.length
      const outcome: AdapterOutcome<BrandIdentityLine[]> = {
        ok: true,
        output: r.output,
        scores: { factual: 1, brand },
        latencyMs: Date.now() - t0,
        ...(response.costUsd !== undefined ? { costUsd: response.costUsd } : {}),
        ...(response.inputTokens !== undefined ? { inputTokens: response.inputTokens } : {}),
        ...(response.outputTokens !== undefined ? { outputTokens: response.outputTokens } : {}),
      }
      return outcome
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Lỗi không xác định" }
    }
  }
}
