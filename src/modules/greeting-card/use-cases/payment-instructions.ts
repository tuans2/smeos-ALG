import { parseBrochurePaymentConfig } from "../domain/brochure-commerce-rules"
import { parsePaymentPolicy, paymentHoldUntil } from "../domain/brochure-payment-policy"
import { policyForOrder } from "../domain/payment-plan"
import { buildPaymentInstructions } from "../adapters/vietqr-helper"
import type { BrochurePaymentInstructions } from "../domain/greeting-card-types"

/**
 * Hướng dẫn chuyển khoản cho lần thu kế tiếp, theo tài khoản của tiệm và kế hoạch thanh toán
 * đã chụp trên đơn (`pricing_rule_ref.paymentPlan` — mã DC30… / đợt); đơn cũ chưa có bản chụp
 * theo chính sách tiệm hiện tại.
 */
export function paymentInstructionsFor(
  shopSettings: unknown,
  order: { totalVnd: number; paidVnd: number; createdAt?: Date | undefined; pricingRuleRef?: unknown },
  orderCode: string
): BrochurePaymentInstructions | null {
  const policy = policyForOrder(parsePaymentPolicy(shopSettings), order.pricingRuleRef)
  const base = buildPaymentInstructions(parseBrochurePaymentConfig(shopSettings), order, policy, orderCode)
  if (!base) return null
  const holdUntil = paymentHoldUntil(policy, order)
  return { ...base, holdUntil, ...(holdUntil && policy.paymentTimeoutMinutes ? { cancelOnExpiry: true } : {}) }
}
