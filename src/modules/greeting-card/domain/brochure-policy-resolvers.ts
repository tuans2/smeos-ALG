import { DEFAULT_BALANCE_PAYMENT_TRIGGER_POLICY, DEFAULT_TRACKING_TRIGGER_POLICY, type BrochurePaymentPolicy, type TrackingTriggerPolicy } from "./brochure-payment-policy"

/**
 * Phân giải cơ chế bắt buộc ảnh chuyển khoản giữa Cài đặt Bộ sưu tập (catalog filters)
 * và Chính sách tiệm. Catalog ghi đè tiệm; nếu không ghi đè thì theo tiệm; mặc định là true (BẬT).
 */
export function resolveRequirePaymentProof(
  policy: BrochurePaymentPolicy,
  catalogFilters?: unknown,
): boolean {
  const filters = catalogFilters && typeof catalogFilters === "object"
    ? (catalogFilters as Record<string, unknown>)
    : {}
  if (typeof filters.requirePaymentProof === "boolean") {
    return filters.requirePaymentProof
  }
  return policy.requirePaymentProof ?? true
}

/**
 * Phân giải cơ chế kích hoạt bước tiếp theo giữa Cài đặt Bộ sưu tập (catalog filters)
 * và Chính sách tiệm. Catalog ghi đè tiệm; nếu không ghi đè thì theo tiệm; mặc định là "PAYMENT_OR_COORDINATOR".
 */
export function resolveTrackingTriggerPolicy(
  policy: BrochurePaymentPolicy,
  catalogFilters?: unknown,
): TrackingTriggerPolicy {
  const filters = catalogFilters && typeof catalogFilters === "object"
    ? (catalogFilters as Record<string, unknown>)
    : {}
  if (filters.trackingTriggerPolicy === "PAYMENT_ONLY" || filters.trackingTriggerPolicy === "PAYMENT_OR_COORDINATOR") {
    return filters.trackingTriggerPolicy
  }
  return policy.trackingTriggerPolicy ?? DEFAULT_TRACKING_TRIGGER_POLICY
}

/**
 * Phân giải cơ chế xác nhận thanh toán lần 2 (balance) giữa Cài đặt Bộ sưu tập
 * và Chính sách tiệm. Catalog ghi đè tiệm; nếu không ghi đè thì theo policy.balancePaymentTriggerPolicy;
 * nếu vẫn chưa có thì kế thừa trackingTriggerPolicy; mặc định cuối cùng là "PAYMENT_OR_COORDINATOR".
 */
export function resolveBalancePaymentTriggerPolicy(
  policy: BrochurePaymentPolicy,
  catalogFilters?: unknown,
): TrackingTriggerPolicy {
  const filters = catalogFilters && typeof catalogFilters === "object"
    ? (catalogFilters as Record<string, unknown>)
    : {}
  if (filters.balancePaymentTriggerPolicy === "PAYMENT_ONLY" || filters.balancePaymentTriggerPolicy === "PAYMENT_OR_COORDINATOR") {
    return filters.balancePaymentTriggerPolicy
  }
  return policy.balancePaymentTriggerPolicy ?? DEFAULT_BALANCE_PAYMENT_TRIGGER_POLICY
}

export type PaymentPurpose = "FULL" | "DEPOSIT" | "BALANCE"
