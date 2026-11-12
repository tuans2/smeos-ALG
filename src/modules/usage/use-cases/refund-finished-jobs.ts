import type { TenantContext } from "@/core/tenancy"
import { GenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository"
import { refundJob } from "./refund-job"

/**
 * Một lượt hoàn credit cho các lượt chạy khách không nhận được kết quả (Guard từ chối, bị huỷ, lỗi kỹ thuật —
 * `usage/domain/refund-policy.ts`). Chạy trong cron 5 phút (`/api/v1/internal/integrations-sweep`, PO 11/11/2026)
 * và bằng tay (`npm run hoan-credit`). Idempotent: `refundJob` chỉ hoàn mỗi lượt trừ một lần, nên lượt quét chạy
 * lại không hoàn trùng. Có giới hạn số job mỗi lượt.
 */
export async function refundFinishedJobs(limit = 200): Promise<{ refundedJobs: number; refundedCredit: number; refunds: { jobId: string; organizationId: string; credit: number; reason: string }[] }> {
  const jobs = await new GenerationJobRepository().listRefundable(limit)
  const refunds: { jobId: string; organizationId: string; credit: number; reason: string }[] = []
  for (const job of jobs) {
    // Ngữ cảnh dựng từ chính dòng job ("`organization_id` chỉ lấy từ dòng job")
    const ctx: TenantContext = {
      organizationId: job.organization_id,
      workspaceId: job.workspace_id,
      userId: job.user_id,
      branchId: job.branch_id,
      capabilities: new Set<string>(),
    }
    const result = await refundJob(ctx, job.id)
    if (result.refunded) refunds.push({ jobId: job.id, organizationId: job.organization_id, credit: result.creditHoanLai, reason: result.lyDo })
  }
  return { refundedJobs: refunds.length, refundedCredit: refunds.reduce((sum, r) => sum + r.credit, 0), refunds }
}
