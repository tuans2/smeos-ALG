import type { AdapterRun } from "@/core/ai/gateway"
import { extractJsonText } from "@/core/ai/adapters/llm-json"
import type { LLMProvider } from "@/core/ports/llm-provider"

/** Kết luận của AI khi đối chiếu ảnh thành phẩm / ảnh giao hàng với mẫu đơn. */
export interface PhotoMatchVerdict {
  isMatch: boolean
  confidenceScore: number // 0 - 100
  verdict: "MATCH" | "MISMATCH" | "UNCERTAIN"
  reason: string
}

export interface PhotoMatchRequest {
  system: string
  prompt: string
  /** Theo đúng thứ tự mà `prompt` mô tả (ảnh mẫu → ảnh QC → ảnh cần kiểm). */
  images: ReadonlyArray<{ mimeType: string; base64: string }>
  /** Câu mặc định khi mô hình không ghi lý do. */
  defaultReason: { match: string; mismatch: string }
}

export function parsePhotoMatchJson(raw: string, defaults: PhotoMatchRequest["defaultReason"]): PhotoMatchVerdict | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!parsed || typeof parsed !== "object" || typeof parsed.isMatch !== "boolean") return null
    const isMatch = parsed.isMatch
    const confidenceScore = typeof parsed.confidenceScore === "number" ? Math.max(0, Math.min(100, parsed.confidenceScore)) : 0
    const reason = typeof parsed.reason === "string" && parsed.reason.trim() ? parsed.reason.trim() : isMatch ? defaults.match : defaults.mismatch
    return { isMatch, confidenceScore, verdict: isMatch && parsed.verdict !== "MISMATCH" ? "MATCH" : "MISMATCH", reason }
  } catch {
    return null
  }
}

/** Adapter vision cho `callCapability` — mô hình trả JSON `{ isMatch, confidenceScore, verdict, reason }`. */
export function createPhotoMatchVisionAdapter(
  llm: LLMProvider,
  request: PhotoMatchRequest,
  organizationId: string
): AdapterRun<PhotoMatchVerdict> {
  return async (model) => {
    const start = Date.now()
    try {
      const res = await llm.complete({
        organizationId,
        model: model.key,
        system: request.system,
        prompt: request.prompt,
        images: request.images,
        jsonSchema: { type: "object" },
        maxTokens: 300,
        timeoutMs: 20_000,
      })
      const output = parsePhotoMatchJson(extractJsonText(res.text), request.defaultReason)
      if (!output) return { ok: false, message: "Mô hình không trả JSON kiểm định ảnh hợp lệ" }
      return {
        ok: true,
        output,
        latencyMs: Date.now() - start,
        imageCount: request.images.length,
        ...(res.costUsd !== undefined ? { costUsd: res.costUsd } : {}),
        ...(res.inputTokens !== undefined ? { inputTokens: res.inputTokens } : {}),
        ...(res.outputTokens !== undefined ? { outputTokens: res.outputTokens } : {}),
      }
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : String(error) }
    }
  }
}
