import { prisma } from "@/core/tenancy/infra/prisma"
import type { DbClient } from "@/modules/organization/infra/db-client"
import { RENEWAL_NOTICE_DAYS } from "../domain/subscription-rules"

const DAY_MS = 86_400_000

/**
 * Tổ chức có gói cần xét trong lượt quét: đang quá hạn, đã tới cửa sổ gia hạn (7 ngày trước hết kỳ), hoặc chưa
 * nhận credit tặng của tháng này. Gói không rơi vào ba nhóm này là "yên" — `checkSubscription` cũng bỏ qua.
 */
export async function listSubscriptionsToCheck(now: Date, period: string, limit: number, db: DbClient = prisma): Promise<string[]> {
  // Kỳ hết trong 7 ngày tới (hoặc đã hết) = cửa sổ gia hạn đã mở (`renewalOpensAt`)
  const renewalHorizon = new Date(now.getTime() + RENEWAL_NOTICE_DAYS * DAY_MS)
  const rows = await db.subscriptions.findMany({
    where: {
      status: { not: "CANCELLED" },
      OR: [
        { status: "OVERDUE" },
        { current_period_end: { lte: renewalHorizon } },
        { included_credits_monthly: { gt: 0 }, OR: [{ plan_credit_period: null }, { NOT: { plan_credit_period: period } }] },
      ],
    },
    select: { organization_id: true },
    orderBy: { current_period_end: "asc" },
    take: limit,
  })
  return rows.map((r) => r.organization_id)
}
