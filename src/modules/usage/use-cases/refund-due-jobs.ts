import { log } from "@/core/observability/log"
import type { TenantContext } from "@/core/tenancy"
import type { generation_jobs } from "@/modules/jobs/infra/entities"
import { GenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository"
import { refundJob } from "./refund-job"

/** Số job xét mỗi lượt quét — có trần. */
export const REFUND_SWEEP_BATCH = 200

export interface RefundDueDeps {
  list: (limit: number) => Promise<generation_jobs[]>
  refund: typeof refundJob
}

/**
 * Hoàn credit cho job khách không nhận được kết quả, mọi tổ chức (audit BL-32, 11/11/2026). Trước đây chỉ chạy khi có
 * người mở lại đúng màn job hoặc chạy tay `npm run hoan-credit` — trên Render không lịch nào gọi, job bị quét treo thành
 * `FAILED` mà không ai mở lại thì mất credit. Nay chạy sau mỗi lượt quét job treo (cron 5 phút). `refundJob` idempotent
 * (khoá tư vấn + sổ `usage`), nên chạy song song với lối hoàn lúc đọc không hoàn hai lần. Lỗi một job không chặn job khác.
 */
export async function refundDueJobs(
  deps: RefundDueDeps = { list: (n) => new GenerationJobRepository().listRefundable(n), refund: refundJob },
): Promise<{ refunded: number; credit: number; failed: number }> {
  let refunded = 0
  let credit = 0
  let failed = 0
  for (const job of await deps.list(REFUND_SWEEP_BATCH)) {
    // Ngữ cảnh dựng từ chính dòng job — `organization_id` chỉ lấy từ dòng job, như worker
    const ctx: TenantContext = {
      organizationId: job.organization_id,
      workspaceId: job.workspace_id,
      userId: job.user_id,
      branchId: job.branch_id,
      capabilities: new Set<string>(),
    }
    try {
      const outcome = await deps.refund(ctx, job.id)
      if (outcome.refunded) {
        refunded += 1
        credit += outcome.creditHoanLai
      }
    } catch (error) {
      failed += 1
      log.warn("usage.refund_due_failed", { jobId: job.id, error: error instanceof Error ? error.message : String(error) })
    }
  }
  return { refunded, credit, failed }
}
