import type { TenantContext } from "@/core/tenancy"
import { validationFailed } from "@/core/http/errors"
import { periodRange } from "@/modules/usage/domain/platform-margin"
import { monthlySnapshotFor } from "@/modules/usage/infra/usage-limit-repository"
import { findSubscription } from "@/modules/subscription/infra/subscription-repository"
import type { IOrganizationRepository } from "@/modules/organization/domain/repositories/organization-repository.interface"
import { getOrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { getUsageRepository } from "@/modules/usage/infra/usage-repository"
import type { IUsageRepository } from "@/modules/usage/domain/repositories/usage-repository.interface"

/**
 * `GET /usage/summary` (`G8`, đặc tả 06 mục 10).
 *
 * Chưa chia theo chi nhánh cho tổ chức Chuỗi — `usage` không có cột
 * `branch_id` ở đặc tả 07 mục 7. Ghi ở `docs/dac-ta/TECHNICAL_DEBT.md`.
 */
export async function getUsageSummary(
  ctx: TenantContext,
  repo: IUsageRepository = getUsageRepository(),
  orgRepo: IOrganizationRepository = getOrganizationRepository(),
  /** Kỳ YYYY-MM (giờ Việt Nam, checklist ALG 6.9); bỏ trống = toàn thời gian */
  period?: string | null
) {
  const range = period ? periodRange(period) : null
  if (period && !range) throw validationFailed({ period: "Kỳ theo dạng YYYY-MM" })
  const [byFeature, organization, monthly, subscription] = await Promise.all([
    repo.summaryByFeature(ctx, range ?? undefined),
    orgRepo.current(ctx),
    range ? monthlySnapshotFor(ctx.organizationId, period!) : Promise.resolve(null),
    range ? findSubscription(ctx.organizationId) : Promise.resolve(null),
  ])

  const creditUsed = byFeature.reduce((sum, row) => sum + row.costCredit, 0)

  return {
    by_feature: byFeature.map((row) => ({
      feature: row.feature,
      quantity: row.quantity,
      cost_credit: row.costCredit,
    })),
    credit_used: creditUsed,
    credit_balance: organization?.credit_balance ?? 0,
    // So với hạn mức tháng và credit tặng theo gói của kỳ (10.3, 10.7)
    ...(range
      ? {
          period,
          monthly_limit: monthly?.credit.limit ?? null,
          ai_limit: monthly?.ai.limit ?? null,
          plan: subscription && subscription.status !== "CANCELLED"
            ? { code: subscription.plan, included_credits_monthly: subscription.included_credits_monthly }
            : null,
        }
      : {}),
  }
}
