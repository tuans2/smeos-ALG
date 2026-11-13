/**
 * Nối cổng AI vào repository thật. Đây là chỗ DUY NHẤT trong `core/ai` biết
 * tới Prisma — `gateway.ts` và `domain/` không import hạ tầng.
 */
import type { TenantContext } from "@/core/tenancy"

import { AiEvaluationRepository } from "./infra/ai-evaluation-repository"
import { AiPolicyRepository } from "./infra/ai-policy-repository"
import { AiRegistryRepository, licenseComplete } from "./infra/ai-registry-repository"
import { AiRequestRepository } from "./infra/ai-request-repository"
import type { AiGatewayDeps } from "./gateway"
import type { AiClass, AiMeasureState, AiModelCandidate, AiPolicy } from "./domain/routing"

function toCandidate(row: {
  key: string
  provider: string
  enabled: boolean
  measure_state: string
  leaves_infra: boolean
  quality_class: string
  cost_class: string
  latency_class: string
  capabilities: unknown
  license: string
  territory: string
  allowed_use: string
  commercial_use: boolean
}): AiModelCandidate {
  return {
    key: row.key,
    provider: row.provider,
    enabled: row.enabled,
    measureState: row.measure_state as AiMeasureState,
    leavesInfra: row.leaves_infra,
    qualityClass: row.quality_class as AiClass,
    costClass: row.cost_class as AiClass,
    latencyClass: row.latency_class as AiClass,
    capabilities: Array.isArray(row.capabilities) ? (row.capabilities as string[]) : [],
    licenseComplete: licenseComplete(row),
  }
}

export function aiGatewayDeps(ctx: TenantContext): AiGatewayDeps {
  const registry = new AiRegistryRepository()
  const policies = new AiPolicyRepository()
  const requests = new AiRequestRepository()
  const evaluations = new AiEvaluationRepository()

  return {
    async policyFor(capabilityCode): Promise<AiPolicy> {
      const row = await policies.find(ctx, capabilityCode)
      if (!row) return { allowedModels: [] }
      return {
        allowedModels: Array.isArray(row.allowed_models) ? (row.allowed_models as string[]) : [],
        privacyFloor: row.privacy_floor,
        qualityTarget: (row.quality_target as AiClass | null) ?? undefined,
      }
    },
    async eligibleModels() {
      const rows = await registry.eligibleModels()
      return rows.map(toCandidate)
    },
    async thresholdFor(capabilityCode) {
      const row = await registry.capability(capabilityCode)
      return row?.accept_threshold ?? null
    },
    async recordRequest(row) {
      await requests.record(ctx, row)
    },
    async recordEvaluation(row) {
      await evaluations.record(ctx, row)
    },
  }
}
