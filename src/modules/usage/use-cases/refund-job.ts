import type { TenantContext } from "@/core/tenancy"
import type { IGenerationJobRepository } from "@/modules/jobs/domain/repositories/generation-job-repository.interface"
import { getGenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository"
import { runInTransaction } from "@/modules/jobs/infra/transaction"
import { getOrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { creditLuotHienTai, daHoanHetLuot, lyDoHoanCredit, luotHienTai, type LyDoHoan } from "@/modules/usage/domain/refund-policy"
import { getUsageRepository } from "@/modules/usage/infra/usage-repository"
import type { IUsageRepository } from "@/modules/usage/domain/repositories/usage-repository.interface"

export type RefundOutcome =
  | { refunded: false; reason: "khong-thuoc-dien-hoan" | "da-hoan-truoc-do" | "khong-co-gi-de-hoan" }
  | { refunded: true; creditHoanLai: number; lyDo: LyDoHoan }

/**
 * Hoàn credit cho một lượt chạy khách không nhận được kết quả. Ba diện đủ
 * điều kiện và lý lẽ của từng diện nằm ở `usage/domain/refund-policy.ts` —
 * tệp này chỉ thi hành, không tự quyết diện nào.
 *
 * Ghi một dòng `usage` mới `status = REFUNDED` với `cost_credit = 0` (không
 * trừ thêm) và hoàn lại đúng số credit đã trừ lúc enqueue vào
 * `organizations.credit_balance` — hai việc trong MỘT giao dịch. Dòng
 * `ENQUEUED` cũ giữ nguyên: nó là lịch sử, không phải trạng thái.
 *
 * Lý do của D3, chép lại vì nó dễ bị đảo ngược khi ai đó "tối ưu" sau này:
 * GPU đã tiêu thụ nên chi phí phía nền tảng là thật và phải vào sổ để đối
 * soát; nhưng khách không dùng được kết quả, nên trừ credit của họ là bán
 * một thứ không giao.
 *
 * **Vì sao không nằm trong worker:** `YC-U4` — worker không bao giờ ghi
 * `usage`. Hạn mức và credit là việc của core. Hệ quả là hoàn credit không
 * xảy ra ngay lúc worker ra phán quyết mà ở lần chạy `npm run hoan-credit`
 * kế tiếp (hoặc lần đọc `GET /media/optimizations/:id` kế tiếp) — nhất quán
 * sau một khoảng, không tức thì.
 *
 * Idempotent: gọi lại không hoàn hai lần. Chốt là sự tồn tại của một dòng
 * `REFUNDED` cho chính `job_id` đó.
 */
export async function refundJob(
  ctx: TenantContext,
  jobId: string,
  repo: IUsageRepository = getUsageRepository(),
  jobRepo: IGenerationJobRepository = getGenerationJobRepository()
): Promise<RefundOutcome> {
  const job = await jobRepo.findById(ctx, jobId)
  if (!job) return { refunded: false, reason: "khong-thuoc-dien-hoan" }

  const lyDo = lyDoHoanCredit({ status: job.status, result: job.result })
  if (lyDo === null) return { refunded: false, reason: "khong-thuoc-dien-hoan" }

  const dong = await repo.listByJob(ctx, jobId)
  // Hoàn theo lượt (nợ #200): chạy lại sau khi đã hoàn mở một lượt trừ tiền mới.
  if (daHoanHetLuot(dong)) {
    return { refunded: false, reason: "da-hoan-truoc-do" }
  }

  const daTru = creditLuotHienTai(dong)
  if (daTru <= 0) {
    // Workspace trải nghiệm đi đường hạn mức TRIAL, không trừ credit — không
    // có gì để hoàn, và ghi một dòng REFUNDED rỗng chỉ làm bẩn sổ.
    return { refunded: false, reason: "khong-co-gi-de-hoan" }
  }

  const costUsd = luotHienTai(dong).reduce<number | null>(
    (tong, d) => (d.cost_usd === null ? tong : (tong ?? 0) + (d.cost_usd as number)),
    null
  )

  const daHoan = await runInTransaction(async (tx) => {
    // Cùng khoá với chạy lại (`retry-job.ts`) và hoàn một phần: đọc lại sổ dưới khoá rồi mới ghi.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`refund:${jobId}`}))`
    const dongMoi = await getUsageRepository(tx).listByJob(ctx, jobId)
    if (daHoanHetLuot(dongMoi) || creditLuotHienTai(dongMoi) !== daTru) return false
    await getUsageRepository(tx).recordRefund(ctx, {
      workspaceId: job.workspace_id,
      userId: job.user_id,
      jobId,
      feature: job.feature,
      costUsd,
    })
    const chargedAt = luotHienTai(dongMoi).find((d) => d.status === "ENQUEUED")?.created_at ?? null
    await getOrganizationRepository(tx).refundCredit(ctx, daTru, { service: "AI", reason: lyDo, reference: jobId, chargedAt })
    return true
  })
  if (!daHoan) return { refunded: false, reason: "da-hoan-truoc-do" }

  return { refunded: true, creditHoanLai: daTru, lyDo }
}
