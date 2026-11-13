import { prisma } from "@/core/tenancy/infra/prisma"
import type { TenantContext } from "@/core/tenancy"

import type { ai_policies, InputJsonValue } from "./entities"
import type { DbClient } from "./db-client"
import type { IAiPolicyRepository, AiPolicyRecord } from "../domain/ai-repository.interface"

export type UpsertAiPolicyInput = {
  capability_code: string
  allowed_models: string[]
  quality_target?: string | null | undefined
  cost_ceiling?: number | null | undefined
  privacy_floor: "PUBLIC" | "SHOP" | "SENSITIVE"
}

/** `ai_policies` — thuộc tenant, nên bộ gác tổ chức áp ở đây như mọi bảng khác. */
export class AiPolicyRepository implements IAiPolicyRepository {
  constructor(private readonly db: DbClient = prisma) {}

  async list(ctx: TenantContext): Promise<AiPolicyRecord[]> {
    const rows = await this.db.ai_policies.findMany({
      where: { organization_id: ctx.organizationId },
      orderBy: { capability_code: "asc" },
    })
    return rows as unknown as AiPolicyRecord[]
  }

  async find(ctx: TenantContext, capabilityCode: string): Promise<AiPolicyRecord | null> {
    const row = await this.db.ai_policies.findFirst({
      where: { organization_id: ctx.organizationId, capability_code: capabilityCode },
    })
    return (row as unknown as AiPolicyRecord) ?? null
  }

  async upsert(ctx: TenantContext, input: UpsertAiPolicyInput): Promise<AiPolicyRecord> {
    const fields = {
      allowed_models: input.allowed_models as InputJsonValue,
      quality_target: input.quality_target ?? null,
      cost_ceiling: input.cost_ceiling ?? null,
      privacy_floor: input.privacy_floor,
      updated_by: ctx.userId ?? "system",
    }

    const row = await this.db.ai_policies.upsert({
      where: {
        organization_id_capability_code: {
          organization_id: ctx.organizationId,
          capability_code: input.capability_code,
        },
      },
      create: {
        organization_id: ctx.organizationId,
        capability_code: input.capability_code,
        ...fields,
      },
      update: fields,
    })
    return row as unknown as AiPolicyRecord
  }
}

let aiPolicyRepoInstance: IAiPolicyRepository | null = null

export function getAiPolicyRepository(db?: DbClient): IAiPolicyRepository {
  if (db) return new AiPolicyRepository(db)
  if (!aiPolicyRepoInstance) {
    aiPolicyRepoInstance = new AiPolicyRepository()
  }
  return aiPolicyRepoInstance!
}
