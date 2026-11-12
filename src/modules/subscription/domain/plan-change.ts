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
