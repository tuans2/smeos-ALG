import { log } from "@/core/observability/log"
import { creditPeriod } from "@/modules/usage/domain/monthly-limit"
import { listSubscriptionsToCheck } from "../infra/subscription-sweep-query"
import { checkSubscription } from "./subscription-guard"

export const SUBSCRIPTION_SWEEP_BATCH = 200

export interface SubscriptionSweepDeps {
  list: typeof listSubscriptionsToCheck
  check: typeof checkSubscription
}

/**
 * Vòng đời gói chạy theo lịch (audit hành trình S1, gói UJ-11): trước đây hoá đơn kỳ sau, nhắc 7/1 ngày và
 * chuyển quá hạn chỉ xảy ra khi tổ chức có người thao tác — tiệm nghỉ vài ngày thì không nhận nhắc nào và quay
 * lại là bị khoá ngay. Dùng lại đúng `checkSubscription` (mọi bước đều có chốt chống làm hai lần).
 * Lỗi của một tổ chức không chặn tổ chức khác; lỗi cả lượt → `null`.
 */
export async function sweepSubscriptions(
  now: Date = new Date(),
  deps: SubscriptionSweepDeps = { list: listSubscriptionsToCheck, check: checkSubscription },
): Promise<{ checked: number; failed: number } | null> {
  try {
    const orgIds = await deps.list(now, creditPeriod(now), SUBSCRIPTION_SWEEP_BATCH)
    let failed = 0
    for (const organizationId of orgIds) {
      try {
        await deps.check(organizationId, now)
      } catch (error) {
        failed++
        log.warn("sweep.subscription_failed", { organizationId, error: error instanceof Error ? error.message : String(error) })
      }
    }
    return { checked: orgIds.length, failed }
  } catch (error) {
    log.error("sweep.subscriptions_failed", { error: error instanceof Error ? error.message : String(error) })
    return null
  }
}
