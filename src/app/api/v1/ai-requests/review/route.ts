import { validationFailed } from "@/core/http/errors"
import { parseIntParam } from "@/core/http/pagination"
import { jsonResponse } from "@/core/http/response"
import { reviewAiRequest } from "@/modules/ai-governance/use-cases/review-ai-request"
import { AiRequestRepository } from "@/core/ai/infra/ai-request-repository"
import { reviewAiRequestBody } from "@/app/api/v1/_contracts/requests-admin"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "U3" },
  handler: async ({ request, ctx }) => {
    // Trần 5.000 giữ đúng trần sẵn có của `listReviewQueue`; chữ/số âm trước đây → `take: NaN`/đảo chiều → 500
    const limit = parseIntParam(new URL(request.url).searchParams.get("limit"), { field: "limit", fallback: 100, min: 1, max: 5000 })
    const queue = await new AiRequestRepository().listReviewQueue(ctx, limit)

    return jsonResponse({
      data: queue.map((row) => ({
        id: row.id,
        organization_id: row.organization_id,
        job_id: row.job_id,
        capability_code: row.capability_code,
        model_key: row.model_key,
        attempt: row.attempt,
        escalated_from: row.escalated_from,
        fallback_from: row.fallback_from,
        source: row.source,
        cost_usd: row.cost_usd,
        latency_ms: row.latency_ms,
        quality_score: row.quality_score,
        outcome: row.outcome,
        created_at: row.created_at,
      })),
    })
  },
})

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "U3" },
  handler: async ({ request, ctx }) => {
    const body = await request.json().catch(() => null)
    const parsed = reviewAiRequestBody.safeParse(body)
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const decision = await reviewAiRequest(
      ctx,
      parsed.data.id,
      parsed.data.action,
      parsed.data.note ?? null
    )

    return jsonResponse(decision)
  },
})
