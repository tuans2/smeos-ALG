import Anthropic from "@anthropic-ai/sdk"

import type { LLMProvider, LLMRequest, LLMResponse } from "@/core/ports/llm-provider"
import { env } from "@/lib/env"

import { CONTENT_SYSTEM_PROMPT, extractJsonText, jsonInstruction } from "./llm-json"

/**
 * Anthropic Claude — nhà cung cấp nội dung tương đương OpenAI (PO 25/09/2026).
 * Khoá sổ đăng ký (`ai_models.key`) → mã mô hình; chỉ adapter biết tên mô hình
 * của nhà cung cấp (D15).
 */
const MA_MO_HINH_THEO_KHOA: Readonly<Record<string, string>> = {
  claude_opus: "claude-opus-5",
  claude_sonnet: "claude-sonnet-5",
}
const MA_MO_HINH_MAC_DINH = "claude-opus-5"

/** Giá công bố, USD / triệu token — ghi `cost_usd` vào sổ. */
const GIA_TOKEN: Readonly<Record<string, { vao: number; ra: number }>> = {
  "claude-opus-5": { vao: 5, ra: 25 },
  "claude-sonnet-5": { vao: 2, ra: 10 },
}

export const ANTHROPIC_DEFAULT_TIMEOUT_MS = 180_000

export class AnthropicLLMProvider implements LLMProvider {
  readonly name = "anthropic"
  private readonly client: Anthropic

  constructor(client?: Anthropic) {
    if (client) {
      this.client = client
      return
    }
    const apiKey = env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY không được cấu hình")
    this.client = new Anthropic({ apiKey, maxRetries: 1 })
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const model = (request.model ? MA_MO_HINH_THEO_KHOA[request.model] : undefined) ?? MA_MO_HINH_MAC_DINH
    const base = request.system ?? CONTENT_SYSTEM_PROMPT
    const system = request.jsonSchema ? `${base}\n\n${jsonInstruction(request.jsonSchema)}` : base
    const images = request.images ?? []

    const message = await this.client.beta.messages.create(
      {
        model,
        // Tư duy thích ứng mặc định bật trên Opus 5 / Sonnet 5 và tính vào
        // `max_tokens` — trần của người gọi (700–5000) là cho PHẦN TRẢ LỜI.
        max_tokens: Math.max(16_000, request.maxTokens ?? 0),
        system,
        messages: [
          {
            role: "user",
            content: [
              ...images.map((img) => ({
                type: "image" as const,
                source: { type: "base64" as const, media_type: img.mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data: img.base64 },
              })),
              { type: "text" as const, text: request.prompt },
            ],
          },
        ],
        // Mô hình từ chối vì phân loại an toàn → máy chủ Anthropic tự chạy lại
        // trên mô hình dự phòng trong cùng lời gọi.
        ...(model === "claude-opus-5" ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      },
      { timeout: request.timeoutMs ?? ANTHROPIC_DEFAULT_TIMEOUT_MS }
    )

    // Hỏng thì NÉM — cổng AI chuyển sang nhà cung cấp kế tiếp.
    if (message.stop_reason === "refusal") throw new Error(`Claude từ chối trả lời (${message.stop_details?.category ?? "không rõ"})`)
    if (message.stop_reason === "max_tokens") throw new Error("Claude bị cắt vì chạm trần max_tokens")

    const raw = message.content.map((b) => (b.type === "text" ? b.text : "")).join("")
    const text = request.jsonSchema ? extractJsonText(raw) : raw
    const gia = GIA_TOKEN[message.model] ?? GIA_TOKEN[model]
    const result: LLMResponse = {
      text,
      model: this.name,
      modelVersion: message.model,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    }
    if (gia) result.costUsd = (message.usage.input_tokens / 1e6) * gia.vao + (message.usage.output_tokens / 1e6) * gia.ra
    return result
  }
}
