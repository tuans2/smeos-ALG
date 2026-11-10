import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { reviewAiRequest } from "@/modules/ai-governance/use-cases/review-ai-request"
import { AiRequestRepository } from "@/core/ai/infra/ai-request-repository"
import { reviewAiRequestBody } from "@/app/api/v1/_contracts/requests-admin"

export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "U3")

  const limit = Number(new URL(request.url).searchParams.get("limit") ?? 100)
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
})

export const POST = handle(async (request: Request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "U3")

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
})
