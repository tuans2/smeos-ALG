import { prisma } from "@/core/tenancy/infra/prisma"
import { ACTIVE_ORGANIZATION_ONLY } from "@/modules/organization/infra/active-organization-filter"
import type { DbClient } from "@/modules/organization/infra/db-client"
import { RENEWAL_NOTICE_DAYS } from "../domain/subscription-rules"

const DAY_MS = 86_400_000

/**
 * Tổ chức có gói cần xét trong lượt quét: đang quá hạn, đã tới cửa sổ gia hạn (7 ngày trước hết kỳ), hoặc chưa
 * nhận credit tặng của tháng này. Gói không rơi vào ba nhóm này là "yên" — `checkSubscription` cũng bỏ qua.
 */
export interface SubscriptionSweepCursor {
  periodEnd: Date
  id: string
}

/**
 * Một trang thuê bao cần xét, theo `(current_period_end, id)`; `after` = dòng cuối của trang trước. Trước đây chỉ lấy
 * 200 dòng đầu mỗi lượt: thuê bao quá hạn không trả vẫn khớp điều kiện mãi nên khi > 200 tổ chức quá hạn, tổ chức khác
 * không bao giờ được cấp credit đầu tháng hay nhắc gia hạn qua bộ quét (audit BL-27, cùng lớp lỗi BL-09).
 */
export async function listSubscriptionsToCheck(
  now: Date,
  period: string,
  limit: number,
  after?: SubscriptionSweepCursor,
  db: DbClient = prisma,
): Promise<Array<{ organizationId: string; cursor: SubscriptionSweepCursor }>> {
  // Kỳ hết trong 7 ngày tới (hoặc đã hết) = cửa sổ gia hạn đã mở (`renewalOpensAt`)
  const renewalHorizon = new Date(now.getTime() + RENEWAL_NOTICE_DAYS * DAY_MS)
  const rows = await db.subscriptions.findMany({
    where: {
      status: { not: "CANCELLED" },
      ...ACTIVE_ORGANIZATION_ONLY, // UJ-26: không mở hoá đơn / nhắc gia hạn cho tổ chức tạm ngưng / rời nền tảng
      OR: [
        { status: "OVERDUE" },
        { current_period_end: { lte: renewalHorizon } },
        { included_credits_monthly: { gt: 0 }, OR: [{ plan_credit_period: null }, { NOT: { plan_credit_period: period } }] },
      ],
      ...(after
        ? { AND: [{ OR: [{ current_period_end: { gt: after.periodEnd } }, { current_period_end: after.periodEnd, id: { gt: after.id } }] }] }
        : {}),
    },
    select: { id: true, organization_id: true, current_period_end: true },
    orderBy: [{ current_period_end: "asc" }, { id: "asc" }],
    take: limit,
  })
  return rows.map((r) => ({ organizationId: r.organization_id, cursor: { periodEnd: r.current_period_end, id: r.id } }))
}
