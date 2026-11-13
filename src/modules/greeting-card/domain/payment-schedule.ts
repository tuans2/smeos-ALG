/**
 * PaymentSchedule → PaymentMilestones + trạng thái thanh toán của đơn. Pure TypeScript.
 * Milestone suy ra từ tổng đơn, % cọc (bản chụp trên đơn) và số đã thu (`orders.paid_vnd`,
 * cập nhật cùng giao dịch với sổ thu `order_payments`) — không có bảng thứ hai phải đồng bộ.
 */

export type MilestoneKind = "FULL" | "DEPOSIT" | "BALANCE"
export type MilestoneStatus = "PAID" | "PARTIALLY_PAID" | "PENDING"
/**
 * ON_ORDER = trả khi đặt;
 * AFTER_PRODUCT_PHOTO = trả sau khi hoa xong và tiệm gửi ảnh (thu trước khi giao);
 * AFTER_DELIVERY = trả sau khi giao hoa (thu sau khi giao).
 */
export type MilestoneDue = "ON_ORDER" | "AFTER_PRODUCT_PHOTO" | "AFTER_DELIVERY"

export interface PaymentMilestone {
  seq: number
  kind: MilestoneKind
  due: MilestoneDue
  percent: number
  amountVnd: number
  paidVnd: number
  status: MilestoneStatus
}

export type OrderPaymentStatus = "UNPAID" | "PAYMENT_PENDING" | "PARTIALLY_PAID" | "PAID" | "PAYMENT_FAILED"

/** Tiền cọc: làm tròn LÊN nghìn đồng, không vượt tổng (giống `expectedPayment`). */
export function depositAmountVnd(totalVnd: number, depositPercent: number): number {
  if (depositPercent <= 0 || totalVnd <= 0) return 0
  return Math.min(totalVnd, Math.ceil((totalVnd * depositPercent) / 100 / 1000) * 1000)
}

/**
 * Lịch thu: cọc + phần còn lại, hoặc một lần trả đủ (không cọc, hay cọc làm tròn đã bằng tổng).
 * Tổng các mốc luôn bằng tổng đơn — mã thanh toán không làm đổi tổng tiền.
 * Hỗ trợ 2 cơ chế:
 * - `requireFullBeforeDispatch !== false` (mặc định): Thu trước giao (Mốc 2: AFTER_PRODUCT_PHOTO).
 * - `requireFullBeforeDispatch === false`: Thu sau giao (Mốc 2: AFTER_DELIVERY).
 */
export function buildPaymentSchedule(
  totalVnd: number,
  depositPercent: number,
  options?: { requireFullBeforeDispatch?: boolean }
): Array<Omit<PaymentMilestone, "paidVnd" | "status">> {
  const total = Math.max(0, Math.round(totalVnd))
  const deposit = depositAmountVnd(total, depositPercent)
  if (deposit <= 0 || deposit >= total) return [{ seq: 1, kind: "FULL", due: "ON_ORDER", percent: 100, amountVnd: total }]
  const requireFull = options?.requireFullBeforeDispatch ?? true
  const secondDue: MilestoneDue = requireFull ? "AFTER_PRODUCT_PHOTO" : "AFTER_DELIVERY"
  return [
    { seq: 1, kind: "DEPOSIT", due: "ON_ORDER", percent: depositPercent, amountVnd: deposit },
    { seq: 2, kind: "BALANCE", due: secondDue, percent: 100 - depositPercent, amountVnd: total - deposit },
  ]
}

/** Gán số đã thu lần lượt vào từng mốc theo thứ tự. */
export function paymentMilestones(
  totalVnd: number,
  depositPercent: number,
  paidVnd: number,
  options?: { requireFullBeforeDispatch?: boolean }
): PaymentMilestone[] {
  let left = Math.max(0, paidVnd)
  return buildPaymentSchedule(totalVnd, depositPercent, options).map((m) => {
    const paid = Math.min(left, m.amountVnd)
    left -= paid
    const status: MilestoneStatus = paid >= m.amountVnd && m.amountVnd > 0 ? "PAID" : paid > 0 ? "PARTIALLY_PAID" : "PENDING"
    return { ...m, paidVnd: paid, status }
  })
}

/**
 * Trạng thái thanh toán của đơn. `reported` = khách báo đã chuyển nhưng tiệm chưa xác nhận;
 * `failed` = lần chuyển gần nhất không khớp được đơn (sai số tiền/nội dung) và chưa có khoản thu mới.
 */
/** Đơn bị huỷ vì hết hạn thanh toán (`pricing_rule_ref.paymentFailed`, ghi lúc huỷ). */
export function paymentFailedOf(pricingRuleRef: unknown): boolean {
  const ref = pricingRuleRef && typeof pricingRuleRef === "object" ? (pricingRuleRef as Record<string, unknown>) : {}
  return !!ref.paymentFailed && typeof ref.paymentFailed === "object"
}

export function orderPaymentStatus(f: { totalVnd: number; paidVnd: number; reported?: boolean; failed?: boolean }): OrderPaymentStatus {
  if (f.totalVnd > 0 && f.paidVnd >= f.totalVnd) return "PAID"
  if (f.failed) return "PAYMENT_FAILED"
  if (f.reported) return "PAYMENT_PENDING"
  return f.paidVnd > 0 ? "PARTIALLY_PAID" : "UNPAID"
}

export const PAYMENT_STATUS_LABEL: Record<OrderPaymentStatus, string> = {
  UNPAID: "Chưa thanh toán",
  PAYMENT_PENDING: "Chờ xác nhận chuyển khoản",
  PARTIALLY_PAID: "Đã đặt cọc",
  PAID: "Đã thanh toán đủ",
  PAYMENT_FAILED: "Thanh toán không thành công",
}

export interface PaymentSplit {
  totalVnd: number
  /** Phải trả hôm nay (lúc đặt). */
  dueNowVnd: number
  /** Trả sau khi hoa hoàn thành hoặc sau khi giao hàng. */
  dueLaterVnd: number
  depositPercent: number
}

/** Số tiền hiển thị cho khách lúc đặt: hôm nay / thanh toán sau. */
export function paymentSplit(totalVnd: number, depositPercent: number, options?: { requireFullBeforeDispatch?: boolean }): PaymentSplit {
  const schedule = buildPaymentSchedule(totalVnd, depositPercent, options)
  const now = schedule[0]?.amountVnd ?? 0
  const later = schedule[1]?.amountVnd ?? 0
  return { totalVnd: Math.max(0, Math.round(totalVnd)), dueNowVnd: now, dueLaterVnd: later, depositPercent: later > 0 ? depositPercent : 0 }
}

/**
 * Đơn đang chờ khách trả phần còn lại: đã cọc, còn nợ, chưa huỷ.
 * - Cơ chế 1 (`requireFullBeforeDispatch !== false`, mặc định): Thu trước giao.
 *   Kích hoạt khi hoa xong (READY/DONE) và chưa giao xong (DELIVERED).
 * - Cơ chế 2 (`requireFullBeforeDispatch === false`): Thu sau giao.
 *   Kích hoạt khi hoa xong, đang giao hoặc đã giao xong, cho đến khi trả đủ 100%.
 */
export function balanceDue(
  o: { status: string; productionStatus: string; deliveryStatus: string; totalVnd: number; paidVnd: number },
  options?: { requireFullBeforeDispatch?: boolean }
): boolean {
  if (o.status === "CANCELLED") return false
  if (o.paidVnd <= 0 || o.paidVnd >= o.totalVnd) return false

  const requireFull = options?.requireFullBeforeDispatch ?? true
  const isReady = o.productionStatus === "READY" || o.productionStatus === "DONE"

  if (requireFull) {
    if (o.status === "COMPLETED" || o.deliveryStatus === "DELIVERED") return false
    return isReady
  } else {
    const isDeliveringOrDelivered = o.deliveryStatus === "DELIVERING" || o.deliveryStatus === "DELIVERED"
    return isReady || isDeliveringOrDelivered || o.status === "COMPLETED"
  }
}
