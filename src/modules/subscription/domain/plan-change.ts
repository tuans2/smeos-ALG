/**
 * Đổi gói thuê bao và tiền chuyển dư (PO 12/11/2026, audit BL-27) — luật thuần.
 * - Nâng gói (cùng chu kỳ, giá cao hơn): có hiệu lực ngay; lập hoá đơn bù chênh lệch cho phần còn lại của kỳ, hạn trả
 *   cùng ngày gia hạn. Hoá đơn kỳ sau đã sinh thì cộng thêm chênh lệch giá.
 * - Hạ gói / đổi chu kỳ: giá mới áp từ hoá đơn kỳ sau (hoá đơn kỳ sau đã sinh thì sửa theo giá mới); kỳ đang chạy
 *   không hoàn tiền.
 * - Tiền chuyển dư: trừ vào hoá đơn kỳ kế tiếp; phần còn thừa sau đó do vận hành hoàn khi khách yêu cầu.
 */
import type { SubscriptionCycle } from "./subscription-rules"

export type PlanChangeKind = "UPGRADE" | "NEXT_PERIOD" | "NONE"

export function planChangeKind(before: { priceVnd: number; cycle: SubscriptionCycle }, after: { priceVnd: number; cycle: SubscriptionCycle }): PlanChangeKind {
  if (before.cycle === after.cycle && after.priceVnd === before.priceVnd) return "NONE"
  return before.cycle === after.cycle && after.priceVnd > before.priceVnd ? "UPGRADE" : "NEXT_PERIOD"
}

/** Chênh lệch phải bù cho phần còn lại của kỳ, làm tròn tới 1.000đ; hết kỳ hoặc không tăng giá → 0. */
export function prorationVnd(input: { oldPriceVnd: number; newPriceVnd: number; periodStart: Date; periodEnd: Date; now: Date }): number {
  const total = input.periodEnd.getTime() - input.periodStart.getTime()
  const left = input.periodEnd.getTime() - Math.max(input.now.getTime(), input.periodStart.getTime())
  const diff = input.newPriceVnd - input.oldPriceVnd
  if (total <= 0 || left <= 0 || diff <= 0) return 0
  return Math.round((diff * Math.min(1, left / total)) / 1000) * 1000
}

/** Số tiền hoá đơn kỳ sau (đã sinh, chưa thu) sau khi đổi giá — giữ phần đã trừ từ tiền dư trước đó. */
export function repricedPendingAmount(currentAmountVnd: number, oldPriceVnd: number, newPriceVnd: number): number {
  return Math.max(0, currentAmountVnd + (newPriceVnd - oldPriceVnd))
}

/** Tiền dư trừ vào hoá đơn kế tiếp: phần trừ được và phần còn thừa. */
export function splitOverpayment(surplusVnd: number, nextInvoiceAmountVnd: number): { appliedVnd: number; leftoverVnd: number } {
  const surplus = Math.max(0, Math.floor(surplusVnd))
  const appliedVnd = Math.min(surplus, Math.max(0, nextInvoiceAmountVnd))
  return { appliedVnd, leftoverVnd: surplus - appliedVnd }
}

/** Hạ gói / đổi chu kỳ chờ áp từ kỳ sau (`subscriptions.pending_change`, PO 12/11/2026). */
export interface PendingPlanChange {
  plan: string
  cycle: SubscriptionCycle
  priceVnd: number
  includedCreditsMonthly: number
  /** ISO — hết kỳ lúc đổi; từ mốc này gói mới có hiệu lực. */
  effectiveAt: string
}

export function parsePendingChange(raw: unknown): PendingPlanChange | null {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null
  if (!r) return null
  const cycle = r.cycle === "MONTHLY" || r.cycle === "YEARLY" ? r.cycle : null
  const n = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null)
  const price = n(r.priceVnd), credits = n(r.includedCreditsMonthly)
  const at = typeof r.effectiveAt === "string" && !Number.isNaN(Date.parse(r.effectiveAt)) ? r.effectiveAt : null
  if (typeof r.plan !== "string" || !cycle || price === null || credits === null || !at) return null
  return { plan: r.plan, cycle, priceVnd: price, includedCreditsMonthly: credits, effectiveAt: at }
}

/** Tới lúc áp: đã qua mốc, hoặc kỳ hiện tại đã dời sang kỳ bắt đầu từ mốc (thu tiền kỳ sau sớm). */
export function pendingChangeDue(p: PendingPlanChange, now: Date, currentPeriodStart: Date): boolean {
  const at = Date.parse(p.effectiveAt)
  return now.getTime() >= at || currentPeriodStart.getTime() >= at
}

/** Giá và chu kỳ của hoá đơn bắt đầu từ `periodStart`: kỳ từ mốc đổi trở đi theo gói chờ áp. */
export function billingFor(sub: { priceVnd: number; cycle: SubscriptionCycle }, pending: PendingPlanChange | null, periodStart: Date) {
  return pending && periodStart.getTime() >= Date.parse(pending.effectiveAt) ? { priceVnd: pending.priceVnd, cycle: pending.cycle } : sub
}
