import { log } from "@/core/observability/log"
import { parsePaymentPolicy } from "../domain/brochure-payment-policy"
import { parseShippingConfig } from "../domain/brochure-pricing"
import {
  defaultPaymentPlan,
  findPaymentCode,
  normalizePaymentCode,
  parsePaymentPlans,
  paymentCodeBlocker,
  planFromCode,
  vnToday,
  type PaymentCodeRule,
  type PaymentPlanSnapshot,
} from "../domain/payment-plan"
import { BrochureCheckoutRepository, getBrochureCheckoutRepository } from "../infra/brochure-checkout-repository"

export interface PaymentPlanResolution {
  plan: PaymentPlanSnapshot
  /** Mã thanh toán hợp lệ đã áp (để kiểm lượt dùng lần nữa trong giao dịch tạo đơn). */
  rule: PaymentCodeRule | null
  /** Lỗi trường `paymentCode` (tiếng Việt); có lỗi thì giữ policy mặc định. */
  error: string | null
}

/**
 * Kế hoạch thanh toán cho một báo giá/đơn. Mã thanh toán chỉ được kiểm ở MÁY CHỦ:
 * tồn tại, đang bật, trong hạn, còn lượt, đúng bộ sưu tập, trong khoảng giá trị đơn.
 * Mã không hợp lệ → không đổi policy. Không bao giờ đổi tổng tiền.
 */
export async function resolvePaymentPlan(
  organizationId: string,
  shopSettings: unknown,
  input: { paymentCode?: string | undefined; totalVnd: number | null; catalogId: string | null; deliveryDate?: string | undefined },
  checkout = getBrochureCheckoutRepository(),
  now: Date = new Date(),
): Promise<PaymentPlanResolution> {
  const config = parsePaymentPlans(shopSettings)
  const today = vnToday(now)
  const day = input.deliveryDate && /^\d{4}-\d{2}-\d{2}$/.test(input.deliveryDate.trim()) ? input.deliveryDate.trim() : today
  const fallback = defaultPaymentPlan(parsePaymentPolicy(shopSettings).depositPercent, config, day)
  const code = normalizePaymentCode(input.paymentCode)
  if (!code) return { plan: fallback, rule: null, error: null }

  const rule = findPaymentCode(config, code)
  // Khách gõ nhầm mã giảm giá vào ô mã thanh toán → chỉ đúng ô cần nhập
  const misplaced = !rule && parseShippingConfig(shopSettings).vouchersEnabled === true &&
    (await checkout.findVoucher(organizationId, code)) !== null
  const error = misplaced
    ? "Đây là mã giảm giá — vui lòng nhập ở ô Mã giảm giá"
    : rule
    ? paymentCodeBlocker(rule, {
        today,
        orderTotalVnd: input.totalVnd,
        catalogId: input.catalogId,
        usedCount: rule.maxUses !== null ? await checkout.countPaymentCodeUses(organizationId, rule.code) : 0,
      })
    : "Mã thanh toán không tồn tại"
  if (!rule || error) {
    // Không ghi mã khách nhập (có thể là dữ liệu tuỳ ý) — chỉ ghi kết quả
    log.info("greeting_card.payment_code.rejected", { organizationId, feature: "greeting-card", reason: error ?? "" })
    return { plan: fallback, rule: null, error }
  }
  return { plan: planFromCode(rule), rule, error: null }
}
