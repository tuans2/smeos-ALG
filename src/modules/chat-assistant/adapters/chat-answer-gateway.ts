import { callCapability } from "@/core/ai/gateway"
import { aiGatewayDeps } from "@/core/ai/wiring"
import { createContentLLM } from "@/core/ai/adapters/multi-llm-provider"
import type { TenantContext } from "@/core/tenancy"

/** Trả lời một lượt chat: chuỗi văn bản, hoặc `null` khi không gọi được mô hình (bên gọi tự dùng mẫu dự phòng). */
export type ChatAnswerFn = (input: { system: string; prompt: string; maxTokens: number }) => Promise<string | null>

/**
 * Mọi câu trả lời AI của trợ lý chat đi qua cổng AI (`callCapability`, năng lực `chat_answer`):
 * chọn mô hình theo chính sách tiệm, sàn riêng tư, sổ chi phí, giới hạn thời gian — không gọi thẳng
 * nhà cung cấp (CLAUDE.md luật 5). Lỗi/không có mô hình → `null`, không bao giờ ném.
 */
export function chatAnswerViaGateway(ctx: TenantContext, entityId: string): ChatAnswerFn {
  return async ({ system, prompt, maxTokens }) => {
    try {
      const llm = createContentLLM()
      const result = await callCapability(
        { capability: "chat_answer", privacy: "SHOP", entity: { type: "chat_answer", id: entityId } },
        async (model) => {
          const start = Date.now()
          try {
            const res = await llm.complete({ organizationId: ctx.organizationId, model: model.key, system, prompt, maxTokens, timeoutMs: 20_000 })
            const text = res.text?.trim()
            if (!text) return { ok: false, message: "Mô hình không trả lời" }
            return {
              ok: true,
              output: text,
              latencyMs: Date.now() - start,
              ...(res.costUsd !== undefined ? { costUsd: res.costUsd } : {}),
              ...(res.inputTokens !== undefined ? { inputTokens: res.inputTokens } : {}),
              ...(res.outputTokens !== undefined ? { outputTokens: res.outputTokens } : {}),
            }
          } catch (error) {
            return { ok: false, message: error instanceof Error ? error.message : "Lỗi gọi mô hình" }
          }
        },
        aiGatewayDeps(ctx)
      )
      return result.kind === "xong" ? result.output : null
    } catch {
      return null
    }
  }
}
