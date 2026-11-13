import { prisma } from "@/core/tenancy/infra/prisma"
import type { TenantContext } from "@/core/tenancy"

import type { ai_evaluations, InputJsonValue } from "./entities"
import type { DbClient } from "./db-client"

export type RecordAiEvaluationInput = {
  capability_code: string
  entity_type: string
  entity_id: string
  scores: Record<string, number>
  overall_score: number
  threshold_used?: number | null
  needs_review: boolean
  reason?: string | null
}

export class AiEvaluationRepository {
  constructor(private readonly db: DbClient = prisma) {}

  record(ctx: TenantContext, input: RecordAiEvaluationInput): Promise<ai_evaluations> {
    return this.db.ai_evaluations.create({
      data: {
        organization_id: ctx.organizationId,
        capability_code: input.capability_code,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        scores: input.scores as InputJsonValue,
        overall_score: input.overall_score,
        threshold_used: input.threshold_used ?? null,
        needs_review: input.needs_review,
        reason: input.reason ?? null,
      },
    })
  }

  forEntity(ctx: TenantContext, entityType: string, entityId: string): Promise<ai_evaluations[]> {
    return this.db.ai_evaluations.findMany({
      where: {
        organization_id: ctx.organizationId,
        entity_type: entityType,
        entity_id: entityId,
      },
      orderBy: { created_at: "desc" },
    })
  }
}
