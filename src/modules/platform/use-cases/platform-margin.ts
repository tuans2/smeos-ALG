import type { PlatformContext } from "@/core/platform/platform-context"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { validationFailed } from "@/core/http/errors"
import { readCreditPricing } from "@/modules/usage/infra/credit-pricing-store"
import { marginInputs } from "@/modules/usage/infra/provider-cost-repository"
import { computeMargin, periodRange, type MarginRow } from "@/modules/usage/domain/platform-margin"
import { creditPeriod } from "@/modules/usage/domain/monthly-limit"

/**
 * Console → Mức dùng → Biên lợi nhuận (checklist ALG 10.4, `N4`): theo tháng và theo tổ chức — credit đã thu
 * quy ra VND, chi phí AI thật (USD × tỷ giá Console) cộng chi phí tin nhắn, biên lợi nhuận.
 */
export interface PlatformMarginReport {
  period: string
  rates: { usdToVnd: number; creditValueVnd: number }
  rows: MarginRow[]
  total: Omit<MarginRow, "organizationId" | "organizationName">
}

export async function getPlatformMargin(pctx: PlatformContext, period: string = creditPeriod()): Promise<PlatformMarginReport> {
  requirePlatformCapability(pctx, "N4")
  const range = periodRange(period)
  if (!range) throw validationFailed({ period: "Kỳ theo dạng YYYY-MM" })
  const pricing = await readCreditPricing()
  const rates = { usdToVnd: pricing.usdToVnd, creditValueVnd: pricing.creditValueVnd }
  const rows = (await marginInputs(range.from, range.to)).map((r) => computeMargin(r, rates)).sort((a, b) => b.revenueVnd - a.revenueVnd)
  const sum = rows.reduce(
    (t, r) => ({ creditUsed: t.creditUsed + r.creditUsed, aiCostUsd: t.aiCostUsd + r.aiCostUsd, messageCostVnd: t.messageCostVnd + r.messageCostVnd }),
    { creditUsed: 0, aiCostUsd: 0, messageCostVnd: 0 },
  )
  const { organizationId: _id, organizationName: _name, ...total } = computeMargin({ organizationId: "", organizationName: "", ...sum }, rates)
  return { period, rates, rows, total }
}
