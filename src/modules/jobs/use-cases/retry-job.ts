import { conflict, notFound, quotaExceeded } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { canRetry, JOB_STATUS_LABELS, type JobStatus } from "@/modules/jobs/domain/job-rules"
import { GenerationJobRepository, getGenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository"
import { runInTransaction } from "@/modules/jobs/infra/transaction"
import { getOrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { creditTruKhiChayLai } from "@/modules/usage/domain/refund-policy"
import { getUsageRepository } from "@/modules/usage/infra/usage-repository"

/**
 * `POST /jobs/:id/retry` (`G7`) — chỉ job `FAILED` (`YC-J3`). Job
 * `COMPLETED` với `result = REJECTED` trả 409, không phải 200: chạy lại cho
 * ra đúng phán quyết cũ, chỉ tốn GPU (đặc tả 06 mục 7).
 *
 * Nợ #200 (PO 30/10/2026): lượt trước đã được hoàn credit thì chạy lại là một lượt trừ tiền mới —
 * trừ đúng giá lượt trước, ghi dòng `usage` `ENQUEUED`, cùng giao dịch với đưa job về `PENDING`.
 * Không đủ credit → 422 `QUOTA_EXCEEDED` (như lúc tạo job), job giữ nguyên `FAILED`.
 */
export async function retryJob(ctx: TenantContext, id: string) {
  const repo = getGenerationJobRepository()
  const current = await repo.findById(ctx, id)
  if (!current) throw notFound()
  if (!canRetry(current.status)) {
    throw conflict(`Tác vụ đang ở trạng thái "${JOB_STATUS_LABELS[current.status as JobStatus]}" — chỉ chạy lại được tác vụ bị lỗi.`)
  }

  return runInTransaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`refund:${id}`}))`
    const usageRepo = getUsageRepository(tx)
    const cost = creditTruKhiChayLai(await usageRepo.listByJob(ctx, id))
    if (cost > 0) {
      const ok = await getOrganizationRepository(tx).tryDeductCredit(ctx, cost, { service: "AI", reason: `Chạy lại ${current.feature}`, reference: id })
      if (!ok) throw quotaExceeded("Không đủ credit để chạy lại", { required: cost })
      await usageRepo.record(ctx, {
        workspaceId: current.workspace_id,
        userId: ctx.userId,
        jobId: id,
        feature: current.feature,
        costCredit: cost,
        status: "ENQUEUED",
        metadata: { reason: "chay-lai-sau-hoan" },
      })
    }
    const retried = await new GenerationJobRepository(tx).retryIfFailed(ctx, id)
    if (!retried) throw conflict("Tác vụ vừa được chạy lại — tải lại để xem tiến độ.")
    return retried
  })
}
