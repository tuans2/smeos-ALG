import type { LLMProvider, LLMRequest, LLMResponse } from "@/core/ports/llm-provider"

import { AnthropicLLMProvider } from "./anthropic-llm-provider"
import { GeminiLLMProvider } from "./gemini-llm-provider"
import { OpenAILLMProvider } from "./openai-llm-provider"

/**
 * Bộ phát lời gọi LLM theo KHOÁ MÔ HÌNH cổng AI đã chọn (`ai_models.key`) —
 * nhiều nhà cung cấp vai trò tương đương (PO 25/09/2026). Nhà cung cấp dựng
 * LƯỜI: thiếu khoá thì ném ngay trong `complete()`, cổng AI ghi `FAILED` và
 * chuyển sang mô hình kế tiếp theo thứ tự ưu tiên của tiệm.
 */
const NHA_CUNG_CAP_THEO_KHOA: Readonly<Record<string, "openai" | "anthropic" | "gemini">> = {
  openai_structured: "openai",
  openai_direct: "openai",
  claude_opus: "anthropic",
  claude_sonnet: "anthropic",
  gemini_pro: "gemini",
  gemini_flash: "gemini",
}

type Factories = Record<"openai" | "anthropic" | "gemini", () => LLMProvider>

const MAC_DINH: Factories = {
  openai: () => new OpenAILLMProvider(),
  anthropic: () => new AnthropicLLMProvider(),
  gemini: () => new GeminiLLMProvider(),
}

export class MultiLLMProvider implements LLMProvider {
  readonly name = "multi"
  private readonly cache = new Map<string, LLMProvider>()

  constructor(private readonly factories: Factories = MAC_DINH) {}

  async complete(request: LLMRequest): Promise<LLMResponse> {
    // Không nêu mô hình → OpenAI (hành vi cũ). Nêu khoá lạ (vd `local_cv` —
    // chạy ở worker, không có adapter TS) → ném để cổng AI sang bên kế tiếp,
    // thay vì âm thầm gọi nhầm nhà cung cấp.
    const vendor = request.model ? NHA_CUNG_CAP_THEO_KHOA[request.model] : "openai"
    if (!vendor) throw new Error(`Không có adapter nội dung cho mô hình "${request.model}"`)
    let provider = this.cache.get(vendor)
    if (!provider) {
      provider = this.factories[vendor]()
      this.cache.set(vendor, provider)
    }
    return provider.complete(request)
  }
}

/** Điểm dựng dùng chung cho mọi use-case gọi LLM nội dung. */
export function createContentLLM(): LLMProvider {
  return new MultiLLMProvider()
}
