import type { TenantContext } from "@/core/tenancy"

export interface ProductCopyEntity {
  id: string
  organization_id: string
  analysis_id: string
  product_id: string | null
  raw: unknown
  edited: unknown | null
  profile_version: string | null
  approval_state: string
  approved_by: string | null
  approved_at: Date | null
  reject_reason: string | null
  job_id: string | null
  model_key: string | null
  provider: string | null
  cost_usd: number | null
  latency_ms: number | null
  created_at: Date
}

export interface CreateProductCopyInput {
  analysisId: string
  productId: string | null
  raw: object
  profileVersion?: string
  jobId?: string | null
  modelKey?: string | null
  provider?: string | null
  costUsd?: number | null
  latencyMs?: number | null
}

export interface IProductCopyRepository {
  createFromAnalysis(ctx: TenantContext, input: CreateProductCopyInput): Promise<ProductCopyEntity>
  findById(ctx: TenantContext, id: string): Promise<ProductCopyEntity | null>
  findByAnalysisId(ctx: TenantContext, analysisId: string): Promise<ProductCopyEntity | null>
  listByProduct(ctx: TenantContext, productId: string): Promise<ProductCopyEntity[]>
  listPendingApproval(ctx: TenantContext): Promise<ProductCopyEntity[]>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listByApprovalState(ctx: TenantContext, approvalState: any): Promise<ProductCopyEntity[]>
  updateEdited(ctx: TenantContext, id: string, edited: object): Promise<ProductCopyEntity>
  approve(
    ctx: TenantContext,
    id: string,
    approvedBy: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tx: any,
    danhMucDip?: ReadonlyArray<{ code: string; name: string }>
  ): Promise<{ productCopy: ProductCopyEntity; product: { id: string; name: string }; preservedAttributeKeys: string[] }>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reject(ctx: TenantContext, id: string, tx: any, reason?: string): Promise<ProductCopyEntity>
}
