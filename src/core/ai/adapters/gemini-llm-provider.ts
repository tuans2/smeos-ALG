import type { LLMProvider, LLMRequest, LLMResponse } from "@/core/ports/llm-provider"
import { env } from "@/lib/env"

import { CONTENT_SYSTEM_PROMPT, extractJsonText, jsonInstruction } from "./llm-json"

/**
 * Google Gemini — nhà cung cấp nội dung tương đương (PO 25/09/2026). REST
 * `generateContent` của Gemini API (cùng họ endpoint với adapter Veo của worker).
 */
const MA_MO_HINH_THEO_KHOA: Readonly<Record<string, string>> = {
  gemini_pro: "gemini-2.5-pro",
  gemini_flash: "gemini-2.5-flash",
}
const MA_MO_HINH_MAC_DINH = "gemini-2.5-pro"
const GIA_TOKEN: Readonly<Record<string, { vao: number; ra: number }>> = {
  "gemini-2.5-pro": { vao: 1.25, ra: 10 },
  "gemini-2.5-flash": { vao: 0.3, ra: 2.5 },
}
export const GEMINI_DEFAULT_TIMEOUT_MS = 180_000
const BASE = "https://generativelanguage.googleapis.com/v1beta/models"

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number }
  modelVersion?: string
  promptFeedback?: { blockReason?: string }
}

export class GeminiLLMProvider implements LLMProvider {
  readonly name = "gemini"
  private readonly apiKey: string

  constructor(apiKey?: string, private readonly fetchImpl: typeof fetch = fetch) {
    const key = apiKey ?? env.GEMINI_API_KEY
    if (!key) throw new Error("GEMINI_API_KEY không được cấu hình")
    this.apiKey = key
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const model = (request.model ? MA_MO_HINH_THEO_KHOA[request.model] : undefined) ?? MA_MO_HINH_MAC_DINH
    const base = request.system ?? CONTENT_SYSTEM_PROMPT
    const system = request.jsonSchema ? `${base}\n\n${jsonInstruction(request.jsonSchema)}` : base
    const images = request.images ?? []
    const timeoutMs = request.timeoutMs ?? GEMINI_DEFAULT_TIMEOUT_MS

    const res = await this.fetchImpl(`${BASE}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [
          {
            role: "user",
            parts: [...images.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } })), { text: request.prompt }],
          },
        ],
        generationConfig: {
          // Mô hình 2.5 có tư duy tính vào trần đầu ra — cùng lý do adapter Claude.
          maxOutputTokens: Math.max(16_000, request.maxTokens ?? 0),
          ...(request.jsonSchema ? { responseMimeType: "application/json" } : {}),
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) throw new Error(`Gemini API lỗi ${res.status}: ${(await res.text()).slice(0, 300)}`)
    const data = (await res.json()) as GeminiResponse
    if (data.promptFeedback?.blockReason) throw new Error(`Gemini chặn yêu cầu: ${data.promptFeedback.blockReason}`)
    const cand = data.candidates?.[0]
    if (cand?.finishReason === "MAX_TOKENS") throw new Error("Gemini bị cắt vì chạm trần token")
    const raw = (cand?.content?.parts ?? []).map((p) => p.text ?? "").join("")
    if (!raw) throw new Error(`Gemini không trả nội dung (finishReason=${cand?.finishReason ?? "?"})`)

    const vao = data.usageMetadata?.promptTokenCount ?? 0
    const ra = (data.usageMetadata?.candidatesTokenCount ?? 0) + (data.usageMetadata?.thoughtsTokenCount ?? 0)
    const gia = GIA_TOKEN[model]
    const result: LLMResponse = {
      text: request.jsonSchema ? extractJsonText(raw) : raw,
      model: this.name,
      modelVersion: data.modelVersion ?? model,
      inputTokens: vao,
      outputTokens: ra,
    }
    if (gia) result.costUsd = (vao / 1e6) * gia.vao + (ra / 1e6) * gia.ra
    return result
  }
}
