/**
 * Biên lợi nhuận nền tảng (checklist ALG 10.4) — luật thuần. Doanh thu = credit khách đã dùng (sau hoàn) × giá trị
 * 1 credit; chi phí = chi phí AI (USD × tỷ giá) + chi phí tin nhắn (VND). Biên = doanh thu − chi phí.
 */

export interface MarginInput {
  organizationId: string
  organizationName: string
  creditUsed: number
  aiCostUsd: number
  messageCostVnd: number
}

export interface MarginRow extends MarginInput {
  revenueVnd: number
  costVnd: number
  marginVnd: number
  marginPercent: number | null
}

export function computeMargin(row: MarginInput, rates: { usdToVnd: number; creditValueVnd: number }): MarginRow {
  const revenueVnd = Math.round(Math.max(0, row.creditUsed) * rates.creditValueVnd)
  const costVnd = Math.round(row.aiCostUsd * rates.usdToVnd + row.messageCostVnd)
  const marginVnd = revenueVnd - costVnd
  return { ...row, revenueVnd, costVnd, marginVnd, marginPercent: revenueVnd > 0 ? Math.round((marginVnd / revenueVnd) * 1000) / 10 : null }
}

/** Khoảng thời gian UTC của một kỳ YYYY-MM theo giờ Việt Nam. */
export function periodRange(period: string): { from: Date; to: Date } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(period)
  if (!m) return null
  const y = Number(m[1]), mo = Number(m[2])
  if (mo < 1 || mo > 12) return null
  const from = new Date(Date.UTC(y, mo - 1, 1) - 7 * 3_600_000)
  const to = new Date(Date.UTC(mo === 12 ? y + 1 : y, mo === 12 ? 0 : mo, 1) - 7 * 3_600_000)
  return { from, to }
}
