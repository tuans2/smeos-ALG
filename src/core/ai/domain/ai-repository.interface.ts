import type { TenantContext } from "@/core/tenancy"

// ─────────────────────────────────────────────
// AiPolicy
// ─────────────────────────────────────────────

export interface AiPolicyRecord {
  id: string
  organization_id: string
  capability_code: string
  allowed_models: unknown
  quality_target: string | null
  cost_ceiling: number | null
  privacy_floor: "PUBLIC" | "SHOP" | "SENSITIVE"
  updated_by: string
  updated_at: Date
}

export interface UpsertAiPolicyInput {
  capability_code: string
  allowed_models: string[]
  quality_target?: string | null | undefined
  cost_ceiling?: number | null | undefined
  privacy_floor: "PUBLIC" | "SHOP" | "SENSITIVE"
}

export interface IAiPolicyRepository {
  list(ctx: TenantContext): Promise<AiPolicyRecord[]>
  find(ctx: TenantContext, capabilityCode: string): Promise<AiPolicyRecord | null>
  upsert(ctx: TenantContext, input: UpsertAiPolicyInput): Promise<AiPolicyRecord>
}

// ─────────────────────────────────────────────
// AiRegistry
// ─────────────────────────────────────────────

export interface AiCapabilityRow {
  code: string
  enabled: boolean
  needs_approval: boolean
  privacy_floor: string
  accept_threshold: number | null
  measure_channels: unknown
  [key: string]: unknown
}

export interface AiModelRow {
  key: string
  display_name: string
  measure_state: string
  leaves_infra: boolean
  cost_class: string
  quality_class: string
  capabilities: unknown
  enabled: boolean
  license: string | null
  territory: string | null
  allowed_use: string | null
  commercial_use: boolean | null
  [key: string]: unknown
}

export interface IAiRegistryRepository {
  capabilities(): Promise<AiCapabilityRow[]>
  capability(code: string): Promise<AiCapabilityRow | null>
  eligibleModels(): Promise<AiModelRow[]>
  allModels(): Promise<AiModelRow[]>
}

// ─────────────────────────────────────────────
// AiRequest
// ─────────────────────────────────────────────

export interface AiRequestRecord {
  id: string
  organization_id: string
  capability_code: string
  model_key: string
  outcome: string
  source: string
  attempt: number
  escalated_from: string | null
  fallback_from: string | null
  job_id: string | null
  input_tokens: number | null
  output_tokens: number | null
  image_count: number | null
  duration_seconds: number | null
  gpu_seconds: number | null
  cost_usd: number | null
  latency_ms: number | null
  quality_score: number | null
  created_at: Date
}

export interface RecordAiRequestInput {
  capability_code: string
  model_key: string
  outcome: "ACCEPTED" | "ESCALATED" | "FAILED" | "NEEDS_REVIEW"
  source: "CORE" | "LOCALBUDD" | "SOCIALFLOW"
  attempt?: number
  escalated_from?: string | null
  fallback_from?: string | null
  job_id?: string | null
  input_tokens?: number | null
  output_tokens?: number | null
  image_count?: number | null
  duration_seconds?: number | null
  gpu_seconds?: number | null
  cost_usd?: number | null
  latency_ms?: number | null
  quality_score?: number | null
}

export interface IAiRequestRepository {
  record(ctx: TenantContext, input: RecordAiRequestInput): Promise<AiRequestRecord>
  list(
    ctx: TenantContext,
    filter?: {
      capability_code?: string | undefined
      from?: Date | undefined
      to?: Date | undefined
      limit?: number | undefined
    } | undefined
  ): Promise<AiRequestRecord[]>
  listReviewQueue(ctx: TenantContext, limit?: number | undefined): Promise<AiRequestRecord[]>
  getById(ctx: TenantContext, id: string): Promise<AiRequestRecord | null>
  updateOutcome(
    ctx: TenantContext,
    id: string,
    outcome: "ACCEPTED" | "FAILED" | "NEEDS_REVIEW"
  ): Promise<AiRequestRecord | null>
}
