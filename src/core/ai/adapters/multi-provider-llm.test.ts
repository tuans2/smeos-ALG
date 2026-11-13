import { describe, expect, it, vi } from "vitest"

import type Anthropic from "@anthropic-ai/sdk"

vi.mock("@/lib/env", () => ({ env: { OPENAI_API_KEY: "sk-test" } }))

import { AnthropicLLMProvider } from "./anthropic-llm-provider"
import { GeminiLLMProvider } from "./gemini-llm-provider"
import { extractJsonText } from "./llm-json"
import { MultiLLMProvider } from "./multi-llm-provider"

function claudeGia(ra: Partial<{ stop_reason: string; text: string; model: string }> = {}) {
  const create = vi.fn().mockResolvedValue({
    model: ra.model ?? "claude-opus-5",
    stop_reason: ra.stop_reason ?? "end_turn",
    stop_details: null,
    content: [{ type: "text", text: ra.text ?? '```json\n{"a":1}\n```' }],
    usage: { input_tokens: 1000, output_tokens: 2000 },
  })
  return { client: { beta: { messages: { create } } } as unknown as Anthropic, create }
}

describe("AnthropicLLMProvider", () => {
  it("khoá sổ đăng ký → mã mô hình; bật dự phòng phía máy chủ cho Opus 5; bóc JSON; tính giá", async () => {
    const { client, create } = claudeGia()
    const r = await new AnthropicLLMProvider(client).complete({ organizationId: "o", prompt: "viết", model: "claude_opus", jsonSchema: { type: "object" }, maxTokens: 700 })
    const params = create.mock.calls[0]![0]
    expect(params.model).toBe("claude-opus-5")
    expect(params.max_tokens).toBe(16_000)
    expect(params.betas).toEqual(["server-side-fallback-2026-07-01"])
    expect(params.fallbacks).toBe("default")
    expect(params.system).toContain("JSON")
    expect(r.text).toBe('{"a":1}')
    expect(r.costUsd).toBeCloseTo(0.001 * 5 + 0.002 * 25)
  })

  it("Sonnet 5 không kèm fallbacks; từ chối / cắt trần thì NÉM để cổng AI chuyển bên", async () => {
    const son = claudeGia({ model: "claude-sonnet-5" })
    await new AnthropicLLMProvider(son.client).complete({ organizationId: "o", prompt: "x", model: "claude_sonnet" })
    expect(son.create.mock.calls[0]![0].fallbacks).toBeUndefined()
    await expect(new AnthropicLLMProvider(claudeGia({ stop_reason: "refusal" }).client).complete({ organizationId: "o", prompt: "x" })).rejects.toThrow("từ chối")
    await expect(new AnthropicLLMProvider(claudeGia({ stop_reason: "max_tokens" }).client).complete({ organizationId: "o", prompt: "x" })).rejects.toThrow("max_tokens")
  })
})

describe("GeminiLLMProvider", () => {
  it("gọi generateContent đúng mô hình, JSON mime, đọc token + giá", async () => {
    const f = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"b":2}' }] }, finishReason: "STOP" }], usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50 } }))
    )
    const r = await new GeminiLLMProvider("k", f as unknown as typeof fetch).complete({ organizationId: "o", prompt: "x", model: "gemini_flash", jsonSchema: {} })
    expect(String(f.mock.calls[0]![0])).toContain("gemini-2.5-flash:generateContent")
    const body = JSON.parse(f.mock.calls[0]![1].body)
    expect(body.generationConfig.responseMimeType).toBe("application/json")
    expect(f.mock.calls[0]![1].headers["x-goog-api-key"]).toBe("k")
    expect(r.text).toBe('{"b":2}')
    expect(r.inputTokens).toBe(100)
  })

  it("HTTP lỗi hoặc bị chặn thì ném", async () => {
    const loi = vi.fn().mockResolvedValue(new Response("quota", { status: 429 }))
    await expect(new GeminiLLMProvider("k", loi as unknown as typeof fetch).complete({ organizationId: "o", prompt: "x" })).rejects.toThrow("429")
    const chan = vi.fn().mockResolvedValue(new Response(JSON.stringify({ promptFeedback: { blockReason: "SAFETY" } })))
    await expect(new GeminiLLMProvider("k", chan as unknown as typeof fetch).complete({ organizationId: "o", prompt: "x" })).rejects.toThrow("SAFETY")
  })
})

describe("MultiLLMProvider", () => {
  it("phát theo khoá mô hình cổng AI đã chọn; nhà cung cấp dựng lười, dùng lại", async () => {
    const mk = (name: string) => ({ name, complete: vi.fn().mockResolvedValue({ text: name, model: name, modelVersion: name }) })
    const bo = { openai: mk("openai"), anthropic: mk("anthropic"), gemini: mk("gemini") }
    const dung = { openai: vi.fn(() => bo.openai), anthropic: vi.fn(() => bo.anthropic), gemini: vi.fn(() => bo.gemini) }
    const m = new MultiLLMProvider(dung)
    expect((await m.complete({ organizationId: "o", prompt: "", model: "claude_opus" })).text).toBe("anthropic")
    expect((await m.complete({ organizationId: "o", prompt: "", model: "claude_sonnet" })).text).toBe("anthropic")
    expect((await m.complete({ organizationId: "o", prompt: "", model: "gemini_pro" })).text).toBe("gemini")
    expect((await m.complete({ organizationId: "o", prompt: "", model: "openai_direct" })).text).toBe("openai")
    expect(dung.anthropic).toHaveBeenCalledTimes(1)
    expect(dung.openai).toHaveBeenCalledTimes(1)
  })

  it("thiếu khoá nhà cung cấp → ném trong complete (cổng AI ghi FAILED, sang bên kế tiếp)", async () => {
    const m = new MultiLLMProvider({
      openai: () => { throw new Error("OPENAI_API_KEY không được cấu hình") },
      anthropic: () => { throw new Error("ANTHROPIC_API_KEY không được cấu hình") },
      gemini: () => { throw new Error("GEMINI_API_KEY không được cấu hình") },
    })
    await expect(m.complete({ organizationId: "o", prompt: "", model: "claude_opus" })).rejects.toThrow("ANTHROPIC_API_KEY")
  })
})

describe("extractJsonText", () => {
  it("bỏ rào ```json và lời dẫn", () => {
    expect(extractJsonText('Đây: {"x":1} xong')).toBe('{"x":1}')
    expect(extractJsonText("```\n{\"y\":2}\n```")).toBe('{"y":2}')
  })
})
