import type { PlatformContext } from "@/core/platform/platform-context"
import { hasPlatformCapability, requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { creditPeriod } from "@/modules/usage/domain/monthly-limit"
import { periodRange } from "@/modules/usage/domain/platform-margin"
import { paidInvoicesBetween, subscriptionStatusCounts } from "@/modules/subscription/infra/subscription-repository"
import { readSystemHealth } from "./read-system-health"

/**
 * Tổng quan Console (checklist ALG 9.8, `N1`): số cửa hàng theo trạng thái thuê bao, doanh thu thuê bao đã thu
 * 6 tháng gần nhất (giờ Việt Nam), sức khoẻ hệ thống khi người xem có `N5`.
 */

export function lastPeriods(now: Date, count: number): string[] {
  const out: string[] = []
  const [y, m] = creditPeriod(now).split("-").map(Number) as [number, number]
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1))
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`)
  }
  return out
}

export async function getPlatformOverview(pctx: PlatformContext, now: Date = new Date()) {
  requirePlatformCapability(pctx, "N1")
  const periods = lastPeriods(now, 6)
  const from = periodRange(periods[0]!)!.from
  const to = periodRange(periods.at(-1)!)!.to
  const [counts, paid, health] = await Promise.all([
    subscriptionStatusCounts(),
    paidInvoicesBetween(from, to),
    hasPlatformCapability(pctx, "N5") ? readSystemHealth(pctx, now) : Promise.resolve(null),
  ])
  const revenue = periods.map((period) => {
    const r = periodRange(period)!
    const amountVnd = paid.filter((p) => p.paid_at && p.paid_at >= r.from && p.paid_at < r.to).reduce((s, p) => s + p.amount_vnd, 0)
    return { period, amountVnd }
  })
  return {
    organizations: { ...counts, withoutSubscription: Math.max(0, counts.total - counts.active - counts.overdue - counts.cancelled) },
    subscriptionRevenue: revenue,
    health,
  }
}
