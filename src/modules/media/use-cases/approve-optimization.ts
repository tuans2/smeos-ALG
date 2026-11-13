import { conflict, notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { AssetRepository, getAssetRepository } from "@/modules/assets/infra/asset-repository"
import { GenerationJobRepository, getGenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository"
import { runInTransaction } from "@/modules/jobs/infra/transaction"
import { canApproveOptimization, isGuardResult } from "@/modules/media/domain/optimization-rules"

import { getOptimization, type OptimizationDetail } from "./get-optimization"

/**
 * `POST /media/optimizations/:id/approve` (`I2`, đặc tả 06 mục 8) — **cổng 2,
 * Review & Approve**.
 *
 * Đây là chỗ TRẢ NỢ #30: trước P9 không có đường nào đặt
 * `assets.approval_state = APPROVED`, nên `GET /integration/products/:id/master-image`
 * luôn trả 404 và LocalBudd chưa bao giờ lấy được ảnh nào từ core.
 *
 * Hai việc trong MỘT giao dịch, cùng khuôn `approveAnalysis` của P5:
 *
 *     đặt approval_state = APPROVED  →  audit_logs
 *
 * `YC-R5` — job có `result = REJECTED` trả **409, không phải 403**: người gọi
 * CÓ quyền `I2`, chỉ là bản ghi không ở trạng thái duyệt được. Trả 403 sẽ
 * khiến người dùng đi xin thêm quyền cho một việc mà quyền không giải quyết
 * được.
 */
export async function approveOptimization(
  ctx: TenantContext,
  jobId: string
): Promise<OptimizationDetail> {
  const job = await getGenerationJobRepository().findById(ctx, jobId)
  if (!job) throw notFound()

  if (job.status !== "COMPLETED") {
    throw conflict("Job chưa chạy xong, chưa có gì để duyệt")
  }
  if (!isGuardResult(job.result)) {
    throw conflict("Job không có phán quyết của Identity Guard")
  }
  if (!canApproveOptimization(job.result)) {
    // Cổng an toàn đã nói ảnh này làm sai lệch sản phẩm. Cho người duyệt bấm
    // qua nó là bỏ luôn ý nghĩa của cổng cứng (M04 mục 5.1, `YC-R5`).
    throw conflict("Identity Guard đã từ chối ảnh này — không đưa vào luồng duyệt được")
  }

  const assetRepo = getAssetRepository()
  const master = await assetRepo.findMasterByJobId(ctx, jobId)
  if (!master) throw notFound()

  if (master.approval_state === "APPROVED") {
    throw conflict("Ảnh này đã được duyệt")
  }

  await runInTransaction(async (tx) => {
    const approved = await getAssetRepository(tx).approve(ctx, master.id, {
      approvedBy: ctx.userId,
      approvedAt: new Date(),
    })
    // `null` nghĩa là ai đó vừa duyệt xong giữa lúc đọc và lúc ghi — điều
    // kiện `approval_state: PENDING` nằm ngay trong `where` nên chỉ một
    // người thắng.
    if (!approved) throw conflict("Bản ghi vừa đổi trạng thái, thử lại")

    await recordAuditLog(
      ctx,
      {
        action: "media.approve",
        entityType: "assets",
        entityId: master.id,
        before: { approval_state: master.approval_state },
        after: { approval_state: "APPROVED", job_id: jobId, guard_result: job.result },
      },
      tx
    )
  })

  return getOptimization(ctx, jobId)
}
