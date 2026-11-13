/**
 * Asset Repository Port (Domain Interface).
 * Pure TypeScript — No Prisma or database imports.
 * Belongs to Domain Layer of Assets Module.
 */

import type { TenantContext } from "@/core/tenancy"

export type AssetKind = "ORIGINAL" | "MASTER" | "CATALOG" | "MARKETING" | "SOCIAL" | "BANNER" | "THUMBNAIL"
export type AssetState = "READY" | "PROCESSING" | "FAILED"
export type ApprovalState = "PENDING" | "APPROVED" | "REJECTED"

export interface AssetEntity {
  id: string
  organization_id: string
  product_id: string | null
  parent_asset_id: string | null
  kind: string
  state: string
  version: number
  storage_key: string
  thumb_key: string | null
  mime_type: string
  width: number | null
  height: number | null
  aspect_ratio: string | null
  file_size: number | null
  provider: string | null
  model: string | null
  model_version: string | null
  pipeline_version: string | null
  parameters: unknown
  prompt: string | null
  input_sha256: string | null
  output_sha256: string | null
  quality_score: number | null
  identity_score: number | null
  generated_flags: unknown
  cost_usd: number | null
  metadata: unknown
  approval_state: string
  approved_by: string | null
  approved_at: Date | null
  created_by: string
  created_at: Date
  /** SDAGF D-04 — còn hạn thì không xoá vĩnh viễn. */
  legal_hold_until?: Date | null
}

export interface CreateAssetInput {
  id: string
  productId: string | null
  parentAssetId: string | null
  kind: AssetKind | string
  version: number
  storageKey: string
  thumbKey?: string | null | undefined
  mimeType: string
  width?: number | null | undefined
  height?: number | null | undefined
  aspectRatio?: string | null | undefined
  fileSize?: number | null | undefined
  provider?: string | null | undefined
  model?: string | null | undefined
  modelVersion?: string | null | undefined
  pipelineVersion?: string | null | undefined
  parameters?: Record<string, unknown> | null | undefined
  prompt?: string | null | undefined
  inputSha256?: string | null | undefined
  outputSha256?: string | null | undefined
  qualityScore?: number | null | undefined
  identityScore?: number | null | undefined
  generatedFlags?: Record<string, unknown> | null | undefined
  costUsd?: number | null | undefined
  metadata?: Record<string, unknown> | null | undefined
  createdBy: string
}

export interface ListAssetsOptions {
  productId?: string | undefined
  kind?: AssetKind | string | undefined
  approvalState?: ApprovalState | string | undefined
  parentAssetId?: string | undefined
  limit: number
  cursor?: string | null | undefined
}

export interface IAssetRepository {
  findById(ctx: TenantContext, id: string): Promise<AssetEntity | null>
  findByOrganizationId(organizationId: string, id: string): Promise<AssetEntity | null>
  list(ctx: TenantContext, options: ListAssetsOptions): Promise<AssetEntity[]>
  create(ctx: TenantContext, input: CreateAssetInput): Promise<AssetEntity>
  delete(ctx: TenantContext, id: string): Promise<boolean>
  findMasterByJobId(ctx: TenantContext, jobId: string): Promise<AssetEntity | null>
  approve(
    ctx: TenantContext,
    id: string,
    input: { approvedBy: string; approvedAt: Date }
  ): Promise<AssetEntity | null>
  findApprovedMaster(ctx: TenantContext, productId: string): Promise<AssetEntity | null>
  listByJobId(ctx: TenantContext, jobId: string, kind: AssetKind | string): Promise<AssetEntity[]>
  listDerivedFrom(ctx: TenantContext, parentAssetId: string): Promise<AssetEntity[]>
}
