import { notFound, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { AssetRepository, getAssetRepository } from "@/modules/assets/infra/asset-repository"
import { enqueueJob } from "@/modules/jobs/use-cases/enqueue-job"
import { OrganizationRepository, getOrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { resolveVisionEngine, type VisionEngine } from "@/modules/products/domain/vision-engine"
import { ProductRepository, getProductRepository } from "@/modules/products/infra/product-repository"

export type RequestAnalysisInput = {
  assetIds: string[]
  productId?: string | null | undefined
  idempotencyKey: string
}

export type RequestAnalysisResult = {
  jobId: string
  status: string
  engine: VisionEngine
  usage: { costCredit: number; balanceAfter: number | null }
}

/**
 * `POST /vision/analyses` (`H1`, đặc tả 06 mục 8). Chỉ ghi qua `enqueueJob`
 * dùng chung (`feature = "vision.analyze"`) — hạn mức, ghi `usage`, và
 * `NOTIFY` worker đều đã có sẵn ở đó (đặc tả 07 mục 7, V2 mục 9). Việc của
 * use-case này chỉ là xác nhận `asset_ids`/`product_id` thuộc đúng tổ chức
 * trước khi vào hàng đợi — worker lấy `organization_id` từ chính dòng job,
 * không suy từ payload (`AGENTS.md` luật thu hoạch worker).
 *
 * Một job cho cả lô — `job_id` trả về số ít đúng theo ví dụ đặc tả 06 mục 8;
 * worker ghi một `product_analyses` cho MỖI ảnh trong `asset_ids` khi xử lý
 * xong, không phải một cho cả lô.
 *
 * Bộ máy phân tích CHỐT VÀO `payload` ngay lúc tạo job, không để worker tra
 * lại lúc nhận việc. Điều hành đổi bộ máy giữa lúc một lô đang xếp hàng thì
 * lô đó vẫn chạy bằng bộ đã chọn khi bấm nút — nếu không, hai ảnh trong
 * cùng một lô có thể chạy bằng hai bộ khác nhau và không ai biết.
 */
export async function requestAnalysis(
  ctx: TenantContext,
  input: RequestAnalysisInput
): Promise<RequestAnalysisResult> {
  if (input.assetIds.length === 0) {
    throw validationFailed({ asset_ids: "Cần ít nhất một ảnh" })
  }

  const assetRepo = getAssetRepository()
  for (const assetId of input.assetIds) {
    const asset = await assetRepo.findById(ctx, assetId)
    if (!asset) throw notFound()
  }

  if (input.productId) {
    const product = await getProductRepository().findById(ctx, input.productId)
    if (!product) throw notFound()
  }

  const organization = await getOrganizationRepository().current(ctx)
  const engine = resolveVisionEngine(
    (organization?.settings as Record<string, unknown> | null) ?? null
  )

  const { job, usage } = await enqueueJob(ctx, {
    feature: "vision.analyze",
    payload: {
      asset_ids: input.assetIds,
      product_id: input.productId ?? null,
      engine,
    },
    productId: input.productId ?? null,
    idempotencyKey: input.idempotencyKey,
  })

  return {
    jobId: job.id,
    status: job.status,
    engine,
    usage: { costCredit: usage.costCredit, balanceAfter: usage.balanceAfter },
  }
}
