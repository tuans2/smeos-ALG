/**
 * Tóm tắt thanh toán của một đơn — dùng chung trang theo dõi của khách và màn Điều hành/Sale.
 * Pure TypeScript.
 */
import { policyLabel, policyOf, readPaymentPlan, type PaymentPlanSource } from "./payment-plan"
import {
  balanceDue,
  orderPaymentStatus,
  paymentFailedOf,
  paymentMilestones,
  PAYMENT_STATUS_LABEL,
  type OrderPaymentStatus,
  type PaymentMilestone,
} from "./payment-schedule"

export interface OrderPaymentSummary {
  policy: string
  policyLabel: string
  source: PaymentPlanSource
  paymentCode: string | null
  campaignName: string | null
  depositPercent: number
  totalVnd: number
  paidVnd: number
  remainingVnd: number
  status: OrderPaymentStatus
  statusLabel: string
  milestones: PaymentMilestone[]
  /** Hoa đã xong, đang chờ khách trả phần còn lại. */
  balanceDue: boolean
}

export function orderPaymentSummary(
  order: {
    totalVnd: number
    paidVnd: number
    pricingRuleRef: unknown
    status: string
    productionStatus: string
    deliveryStatus: string
  },
  /** % cọc hiện tại của tiệm — chỉ dùng cho đơn cũ chưa có bản chụp kế hoạch. */
  shopDepositPercent: number,
  flags: { reported?: boolean; failed?: boolean } = {},
  options?: { requireFullBeforeDispatch?: boolean }
): OrderPaymentSummary {
  const plan = readPaymentPlan(order.pricingRuleRef)
  const pct = plan?.depositPercent ?? shopDepositPercent
  const policy = plan?.policy ?? policyOf(pct)
  const status = orderPaymentStatus({
    totalVnd: order.totalVnd, paidVnd: order.paidVnd, reported: flags.reported === true,
    failed: flags.failed === true || paymentFailedOf(order.pricingRuleRef),
  })
  return {
    policy,
    policyLabel: policyLabel(policy),
    source: plan?.source ?? "SHOP_DEFAULT",
    paymentCode: plan?.paymentCode ?? null,
    campaignName: plan?.campaignName ?? null,
    depositPercent: pct,
    totalVnd: order.totalVnd,
    paidVnd: order.paidVnd,
    remainingVnd: Math.max(0, order.totalVnd - order.paidVnd),
    status,
    statusLabel: PAYMENT_STATUS_LABEL[status],
    milestones: order.totalVnd > 0 ? paymentMilestones(order.totalVnd, pct, order.paidVnd, options) : [],
    balanceDue: balanceDue(order, options),
  }
}
