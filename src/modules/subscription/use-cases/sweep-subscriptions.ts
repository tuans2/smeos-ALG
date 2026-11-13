import { log } from "@/core/observability/log"
import { creditPeriod } from "@/modules/usage/domain/monthly-limit"
import { listSubscriptionsToCheck } from "../infra/subscription-sweep-query"
import { checkSubscription } from "./subscription-guard"

export const SUBSCRIPTION_SWEEP_BATCH = 200
/** Trần số trang mỗi lượt quét (vòng lặp có giới hạn) — 200 × 25 = 5.000 thuê bao. */
export const SUBSCRIPTION_SWEEP_MAX_PAGES = 25

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
    const period = creditPeriod(now)
    let after: Awaited<ReturnType<typeof listSubscriptionsToCheck>>[number]["cursor"] | undefined
    let checked = 0
    let failed = 0
    // Đi hết các trang theo con trỏ (có trần) — thuê bao quá hạn lâu không chiếm mãi trang đầu (audit BL-27)
    for (let page = 0; page < SUBSCRIPTION_SWEEP_MAX_PAGES; page += 1) {
      const rows = await deps.list(now, period, SUBSCRIPTION_SWEEP_BATCH, after)
      for (const { organizationId } of rows) {
        checked++
        try {
          await deps.check(organizationId, now)
        } catch (error) {
          failed++
          log.warn("sweep.subscription_failed", { organizationId, error: error instanceof Error ? error.message : String(error) })
        }
      }
      after = rows.at(-1)?.cursor
      if (rows.length < SUBSCRIPTION_SWEEP_BATCH) break
    }
    return { checked, failed }
  } catch (error) {
    log.error("sweep.subscriptions_failed", { error: error instanceof Error ? error.message : String(error) })
    return null
  }
}
