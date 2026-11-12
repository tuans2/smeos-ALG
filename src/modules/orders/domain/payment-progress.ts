/**
 * Tiến độ thanh toán của đơn suy ra từ tổng tiền và số đã thu — một luật cho máy chủ và giao diện (audit BL-31,
 * 11/11/2026; trước đây ≥ 6 nơi tự so `paidVnd`/`totalVnd`). Không lưu, luôn tính lúc đọc. Thuần.
 *
 * - `UNPRICED`: chưa có giá và chưa thu đồng nào (đơn chờ báo giá).
 * - `UNPAID`: có giá, chưa thu.
 * - `DEPOSIT`: đã thu một phần (cọc).
 * - `PAID`: đã thu đủ (hoặc đã thu mà đơn chưa có giá).
 */
export type PaymentProgress = "UNPRICED" | "UNPAID" | "DEPOSIT" | "PAID"

export function paymentProgress(totalVnd: number, paidVnd: number): PaymentProgress {
  if (paidVnd <= 0) return totalVnd > 0 ? "UNPAID" : "UNPRICED"
  return paidVnd < totalVnd ? "DEPOSIT" : "PAID"
}

/** Còn phải thu (có giá và chưa thu đủ). */
export function hasBalanceDue(totalVnd: number, paidVnd: number): boolean {
  const p = paymentProgress(totalVnd, paidVnd)
  return p === "UNPAID" || p === "DEPOSIT"
}
