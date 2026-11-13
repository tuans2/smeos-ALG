/**
 * Port Interface: IProductAnalysisRepository
 * Pure TypeScript — Domain layer (Zero ORM imports).
 */

import type { TenantContext } from "@/core/tenancy"

export interface ProductAnalysisRecord {
  id: string
  organization_id: string
  product_id: string | null
  asset_id: string
  job_id: string
  provider: string
  model: string
  model_version: string
  contract_name: string
  contract_version: string
  raw: unknown
  edited: unknown | null
  approval_state: "PENDING" | "APPROVED" | "REJECTED"
  approved_by: string | null
  approved_at: Date | null
  created_at: Date
  updated_at?: Date
  product?: { id: string; name: string; code: string; category: string | null } | null
}

export interface CreateProductAnalysisInput {
  productId: string | null
  assetId: string
  jobId: string
  provider: string
  model: string
  modelVersion: string
  contractName: string
  contractVersion: string
  raw: Record<string, unknown>
}

export interface ApproveAnalysisInput {
  approvedBy: string
  approvedAt: Date
}

export interface IProductAnalysisRepository {
  findById(ctx: TenantContext, id: string): Promise<ProductAnalysisRecord | null>
  listPending(
    ctx: TenantContext,
    options: { limit: number; cursor?: string | null }
  ): Promise<ProductAnalysisRecord[]>
  listApproved(
    ctx: TenantContext,
    options: { limit: number; cursor?: string | null }
  ): Promise<ProductAnalysisRecord[]>
  listForExport?(
    ctx: TenantContext,
    options: { states?: string[]; from?: Date; to?: Date; limit: number }
  ): Promise<ProductAnalysisRecord[]>
  create(ctx: TenantContext, input: CreateProductAnalysisInput): Promise<ProductAnalysisRecord>
  createApprovedHistorical?(
    ctx: TenantContext,
    input: CreateProductAnalysisInput & ApproveAnalysisInput
  ): Promise<ProductAnalysisRecord>
  updateEdited(
    ctx: TenantContext,
    id: string,
    edited: Record<string, unknown>
  ): Promise<ProductAnalysisRecord | null>
  approve(
    ctx: TenantContext,
    id: string,
    productId: string | null,
    input: ApproveAnalysisInput
  ): Promise<ProductAnalysisRecord | null>
  reject(
    ctx: TenantContext,
    id: string,
    input: ApproveAnalysisInput
  ): Promise<ProductAnalysisRecord | null>
}
