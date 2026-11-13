import { conflict, notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { runInTransaction } from "@/modules/jobs/infra/transaction"
import { APPROVAL_STATE_LABELS, canRejectAnalysis, type ApprovalState } from "@/modules/products/domain/product-analysis-rules"
import { ProductAnalysisRepository, getProductAnalysisRepository } from "@/modules/products/infra/product-analysis-repository"

import { getAnalysis, type AnalysisDetail } from "./get-analysis"

/**
 * `POST /vision/analyses/:id/reject` (`H3`). Đối xứng với `approveAnalysis`:
 * cùng mã năng lực, cùng khuôn ghi `audit_logs` trong một giao dịch — hai
 * phán quyết của cùng một người soát, cùng một mức trách nhiệm.
 *
 * Khác ở chỗ không chạm Product Master. Từ chối chỉ đóng lại một bản ghi
 * trong hàng chờ duyệt; `raw` và `edited` giữ nguyên vì đó là dữ liệu để
 * sau này biết máy đã sai ở đâu.
 */
export async function rejectAnalysis(
  ctx: TenantContext,
  id: string,
  lyDo: string | null
): Promise<AnalysisDetail> {
  const repo = getProductAnalysisRepository()
  const current = await repo.findById(ctx, id)
  if (!current) throw notFound()
  if (!canRejectAnalysis(current.approval_state)) {
    throw conflict(`Bản phân tích đang ở trạng thái "${APPROVAL_STATE_LABELS[current.approval_state as ApprovalState]}", không từ chối được`)
  }

  await runInTransaction(async (tx) => {
    const rejected = await getProductAnalysisRepository(tx).reject(ctx, id, {
      approvedBy: ctx.userId,
      approvedAt: new Date(),
    })
    if (!rejected) throw conflict("Bản ghi vừa đổi trạng thái, thử lại")

    await recordAuditLog(
      ctx,
      {
        action: "product.reject",
        entityType: "product_analyses",
        entityId: id,
        before: { approval_state: current.approval_state },
        after: { approval_state: "REJECTED", ly_do: lyDo },
      },
      tx
    )
  })

  return getAnalysis(ctx, id)
}
