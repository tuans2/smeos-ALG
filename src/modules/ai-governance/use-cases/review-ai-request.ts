import { notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import type { IAiRequestRepository } from "@/core/ai/domain/ai-repository.interface"
import { getAiRequestRepository } from "@/core/ai/infra/ai-request-repository"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"

export type ReviewAction = "approve" | "reject" | "modify"

export type ReviewDecision = {
  id: string
  capability_code: string
  model_key: string
  outcome: "ACCEPTED" | "FAILED" | "NEEDS_REVIEW"
  previous_outcome: string
  action: ReviewAction
  note: string | null
}

const OUTCOME_BY_ACTION: Record<ReviewAction, "ACCEPTED" | "FAILED" | "NEEDS_REVIEW"> = {
  approve: "ACCEPTED",
  reject: "FAILED",
  modify: "NEEDS_REVIEW",
}

export async function reviewAiRequest(
  ctx: TenantContext,
  id: string,
  action: ReviewAction,
  note?: string | null,
  repo: IAiRequestRepository = getAiRequestRepository()
): Promise<ReviewDecision> {
  const existing = await repo.getById(ctx, id)
  if (!existing) throw notFound()

  const newOutcome = OUTCOME_BY_ACTION[action]

  await repo.updateOutcome(ctx, id, newOutcome)

  await recordAuditLog(ctx, {
    action: `ai_request.${action}`,
    entityType: "ai_requests",
    entityId: id,
    before: { outcome: existing.outcome },
    after: { outcome: newOutcome, action, note: note ?? null },
  })

  return {
    id: existing.id,
    capability_code: existing.capability_code,
    model_key: existing.model_key,
    outcome: newOutcome,
    previous_outcome: existing.outcome,
    action,
    note: note ?? null,
  }
}
