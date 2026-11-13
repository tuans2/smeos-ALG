import type { TenantContext } from "@/core/tenancy"

export type IntegrationClient = "LOCALBUDD" | "SOCIALFLOW" | string

export interface IntegrationTokenRecord {
  id: string
  organization_id: string
  client: IntegrationClient
  token_hash: string
  created_by: string
  expires_at: Date
  revoked_at: Date | null
  rotated_from_id: string | null
  created_at: Date
  updated_at?: Date
}

export interface CreateIntegrationTokenInput {
  client: IntegrationClient
  tokenHash: string
  createdBy: string
  expiresAt: Date
  rotatedFromId?: string | null
}

export interface IIntegrationTokenRepository {
  findActiveByHash(tokenHash: string, now: Date): Promise<IntegrationTokenRecord | null>
  list(ctx: TenantContext): Promise<IntegrationTokenRecord[]>
  findById(ctx: TenantContext, id: string): Promise<IntegrationTokenRecord | null>
  create(ctx: TenantContext, input: CreateIntegrationTokenInput): Promise<IntegrationTokenRecord>
  revoke(ctx: TenantContext, id: string, now: Date): Promise<boolean>
}

export interface ContentMetricsInput {
  platform: string
  contentId: string
  metricDate: Date
  reach?: number | null
  impressions?: number | null
  engagement?: number | null
  clicks?: number | null
  conversions?: number | null
  spendUsd?: number | null
}

export interface ContentMetricsRecord {
  id: string
  organization_id: string
  platform: string
  content_id: string
  metric_date: Date
  reach: number | null
  impressions: number | null
  engagement: number | null
  clicks: number | null
  conversions: number | null
  spend_usd: number | null
  created_at?: Date
  updated_at?: Date
}

export interface IContentMetricsRepository {
  upsertByNaturalKey(ctx: TenantContext, input: ContentMetricsInput): Promise<ContentMetricsRecord>
}
