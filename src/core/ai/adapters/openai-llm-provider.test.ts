import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/env", () => ({ env: { OPENAI_API_KEY: "sk-test" } }))

import { OPENAI_DEFAULT_TIMEOUT_MS, OpenAILLMProvider } from "./openai-llm-provider"

function okResponse() {
  return new Response(
    JSON.stringify({ choices: [{ message: { content: "{}" }, finish_reason: "stop" }], model: "gpt-4o-mini" }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  )
}

describe("OpenAILLMProvider — thời hạn chờ", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("luôn gắn AbortSignal vào fetch (mặc định hoặc theo timeoutMs)", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => okResponse())
    vi.stubGlobal("fetch", fetchMock)
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout")

    await new OpenAILLMProvider().complete({ organizationId: "o", prompt: "p" })
    await new OpenAILLMProvider().complete({ organizationId: "o", prompt: "p", timeoutMs: 5_000 })

    expect(timeoutSpy).toHaveBeenNthCalledWith(1, OPENAI_DEFAULT_TIMEOUT_MS)
    expect(timeoutSpy).toHaveBeenNthCalledWith(2, 5_000)
    expect(fetchMock.mock.calls[0]?.[1]).toHaveProperty("signal")
    timeoutSpy.mockRestore()
  })

  it("hết hạn chờ → ném lỗi rõ ràng để cổng AI chuyển mô hình dự phòng", async () => {
    const timeoutError = Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" })
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(timeoutError))
    await expect(new OpenAILLMProvider().complete({ organizationId: "o", prompt: "p", timeoutMs: 10 })).rejects.toThrow(
      "OpenAI không phản hồi sau 10 ms"
    )
  })
})
