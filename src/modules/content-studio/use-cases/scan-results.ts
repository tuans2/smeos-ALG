import type { TenantContext } from "@/core/tenancy"
import { getAnalysis, type AnalysisDetail } from "@/modules/products/use-cases/get-analysis"
import { getContentStudioRepository, type ContentStudioRepository } from "../infra/content-studio-repository"

export interface ScanResult {
  readonly id: string
  readonly asset_id: string
  readonly product_id: string | null
  readonly approval_state: AnalysisDetail["approval_state"]
  readonly image_url: string | null
  readonly data: Record<string, unknown>
}

/**
 * Kết quả của một lượt quét ảnh (H1) — mỗi ảnh một Thẻ sản phẩm chờ duyệt. Thay cho cách cũ đọc cả hàng chờ duyệt
 * (50 dòng) rồi lọc ở trình duyệt: lượt của tổ chức khác → danh sách rỗng (không lộ có tồn tại).
 */
export async function getScanResults(
  ctx: TenantContext,
  jobId: string,
  repo: ContentStudioRepository = getContentStudioRepository(),
): Promise<ScanResult[]> {
  const rows = await repo.analysesOfJob(ctx, jobId)
  const details = await Promise.all(rows.map((r) => getAnalysis(ctx, r.id)))
  return details.map((a) => ({
    id: a.id,
    asset_id: a.asset_id,
    product_id: a.product_id,
    approval_state: a.approval_state,
    image_url: a.image_url,
    data: a.edited ?? a.raw,
  }))
}
