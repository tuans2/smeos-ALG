import { notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { AssetRepository, getAssetRepository } from "@/modules/assets/infra/asset-repository"
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"
import { ProductAnalysisRepository, getProductAnalysisRepository } from "@/modules/products/infra/product-analysis-repository"

export type AnalysisDetail = {
  id: string
  product_id: string | null
  asset_id: string
  image_url: string | null
  job_id: string
  provider: string
  model: string
  model_version: string
  contract_name: string
  contract_version: string
  raw: Record<string, unknown>
  edited: Record<string, unknown> | null
  approval_state: "PENDING" | "APPROVED" | "REJECTED"
  approved_by: string | null
  approved_at: string | null
  created_at: string
}

/** `GET /vision/analyses/:id` (`H1`, đặc tả 06 mục 8). */
export async function getAnalysis(ctx: TenantContext, id: string): Promise<AnalysisDetail> {
  const analysis = await getProductAnalysisRepository().findById(ctx, id)
  if (!analysis) throw notFound()

  let imageUrl: string | null = null
  if (analysis.asset_id) {
    const asset = await getAssetRepository().findById(ctx, analysis.asset_id)
    if (asset?.storage_key) {
      imageUrl = await getStorageProvider().signedUrl(asset.storage_key, 24 * 60 * 60)
    }
  }

  return {
    id: analysis.id,
    product_id: analysis.product_id,
    asset_id: analysis.asset_id,
    image_url: imageUrl,
    job_id: analysis.job_id,
    provider: analysis.provider,
    model: analysis.model,
    model_version: analysis.model_version,
    contract_name: analysis.contract_name,
    contract_version: analysis.contract_version,
    raw: analysis.raw as Record<string, unknown>,
    edited: analysis.edited as Record<string, unknown> | null,
    approval_state: analysis.approval_state,
    approved_by: analysis.approved_by,
    approved_at: analysis.approved_at ? analysis.approved_at.toISOString() : null,
    created_at: analysis.created_at.toISOString(),
  }
}
