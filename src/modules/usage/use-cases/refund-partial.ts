import type { TenantContext } from "@/core/tenancy"
import type { IGenerationJobRepository } from "@/modules/jobs/domain/repositories/generation-job-repository.interface"
import { getGenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository"
import { runInTransaction } from "@/modules/jobs/infra/transaction"
import { getOrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { luotHienTai, soCreditHoanMotPhan, type LyDoHoanMotPhan } from "@/modules/usage/domain/refund-policy"
import { getUsageRepository } from "@/modules/usage/infra/usage-repository"
import type { IUsageRepository } from "@/modules/usage/domain/repositories/usage-repository.interface"

/**
 * Hoàn MỘT PHẦN credit của một job — khách nhận kết quả nhưng rẻ hơn thứ đã
 * trả (lý do ở `refund-policy.ts#LyDoHoanMotPhan`).
 *
 * Ghi một dòng `usage` `status = PARTIAL_REFUND` với `cost_credit` ÂM đúng số
 * hoàn, cùng giao dịch với cộng lại `credit_balance`. Số âm là chủ đích:
 * `refundJob` hoàn "tổng `cost_credit` các dòng", nên nếu job về sau thuộc
 * diện hoàn toàn phần thì nó chỉ hoàn phần còn lại — không bao giờ hoàn quá số
 * đã trừ; và tổng chi tiêu theo feature (`summarizeByFeature`) tự trừ đúng.
 *
 * Idempotent theo (job, lý do), chốt trong giao dịch có khoá tư vấn theo job
 * — hai lượt đọc song song không hoàn hai lần.
 */
export async function refundPartial(
  ctx: TenantContext,
  jobId: string,
  lyDo: LyDoHoanMotPhan,
  soCredit: number,
  repo: IUsageRepository = getUsageRepository(),
  jobRepo: IGenerationJobRepository = getGenerationJobRepository()
): Promise<{ refunded: number }> {
  const job = await jobRepo.findById(ctx, jobId)
  if (!job) return { refunded: 0 }

  return runInTransaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`refund:${jobId}`}))`
    const usageRepo = getUsageRepository(tx)
    const dong = await usageRepo.listByJob(ctx, jobId)
    const hoan = soCreditHoanMotPhan(dong, lyDo, soCredit)
    if (hoan <= 0) return { refunded: 0 }
    await usageRepo.record(ctx, {
      workspaceId: job.workspace_id,
      userId: job.user_id,
      jobId,
      feature: job.feature,
      costCredit: -hoan,
      status: "PARTIAL_REFUND",
      metadata: { reason: lyDo },
    })
    const chargedAt = luotHienTai(dong).find((d) => d.status === "ENQUEUED")?.created_at ?? null
    await getOrganizationRepository(tx).refundCredit(ctx, hoan, { service: "AI", reason: lyDo, reference: jobId, chargedAt })
    return { refunded: hoan }
  })
}
