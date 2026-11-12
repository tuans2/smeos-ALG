import { jsonResponse } from "@/core/http/response"
import { getAiPolicy } from "@/modules/ai-governance/use-cases/get-ai-policy"
import { defineRoute } from "@/core/http/define-route"

/**
 * Danh mục năng lực kèm trạng thái đo lường của từng mô hình (`U1`).
 *
 * Cùng nguồn với `GET /ai-policy` — một năng lực và chính sách của nó là một
 * thứ, không phải hai; tách endpoint chỉ để màn hình đọc danh mục mà không
 * phải đọc cả phần trần.
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "U1" },
  handler: async ({ ctx }) => {
    const { capabilities } = await getAiPolicy(ctx)
    return jsonResponse({
      capabilities: capabilities.map((capability) => ({
        code: capability.capability_code,
        name: capability.capability_name,
        module: capability.module,
        kind: capability.kind,
        needs_approval: capability.needs_approval,
        privacy_floor: capability.privacy_floor,
        accept_threshold: capability.accept_threshold,
        measure_channels: capability.measure_channels,
        models: capability.allowed_models,
      })),
    })
  },
})
