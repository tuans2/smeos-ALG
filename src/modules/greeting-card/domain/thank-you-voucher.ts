import type { VoucherBatchInput } from "@/modules/promotions/domain/voucher-batch"

/**
 * Mã cảm ơn sau đơn hoàn tất (checklist ALG 5.15): một mã giảm giá riêng, dùng một lần, gắn đúng
 * khách đã đặt; phát một lần cho mỗi đơn. Cấu hình ở `organizations.settings.greetingCardThankYou`.
 * Hàm thuần — không Prisma.
 */
export const THANK_YOU_KEY = "greetingCardThankYou"
export const THANK_YOU_CODE_PREFIX = "CAMON"

export interface ThankYouPolicy {
  enabled: boolean
  /** % giảm cho đơn sau */
  percent: number
  /** Số ngày mã còn hiệu lực */
  validDays: number
}

export const DEFAULT_THANK_YOU_POLICY: ThankYouPolicy = { enabled: false, percent: 10, validDays: 60 }

const intIn = (v: unknown, min: number, max: number): number | null =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : null

export function readThankYouPolicy(orgSettings: unknown): ThankYouPolicy {
  const settings = orgSettings && typeof orgSettings === "object" ? (orgSettings as Record<string, unknown>) : {}
  const raw = settings[THANK_YOU_KEY]
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...DEFAULT_THANK_YOU_POLICY }
  const r = raw as Record<string, unknown>
  return {
    enabled: r.enabled === true,
    percent: intIn(r.percent, 1, 100) ?? DEFAULT_THANK_YOU_POLICY.percent,
    validDays: intIn(r.validDays, 1, 365) ?? DEFAULT_THANK_YOU_POLICY.validDays,
  }
}

/** Mỗi đơn một đợt phát hành mang tên này — dùng để tìm lại mã đã phát (không phát hai lần). */
export function thankYouBatchName(orderCode: string): string {
  return `Cảm ơn đơn ${orderCode}`
}

/** Đợt một mã: một lượt dùng, một lượt mỗi khách; % giảm không vượt trần đang áp của tiệm. */
export function thankYouBatchInput(orderCode: string, policy: ThankYouPolicy, maxDiscountPercent: number | null, now: Date): VoucherBatchInput {
  const percent = maxDiscountPercent === null ? policy.percent : Math.min(policy.percent, maxDiscountPercent)
  return {
    name: thankYouBatchName(orderCode),
    mode: "UNIQUE",
    sharedCode: null,
    codePrefix: THANK_YOU_CODE_PREFIX,
    quantity: 1,
    promotionId: null,
    discountType: "PERCENTAGE",
    discountValue: percent,
    minOrderVnd: 0,
    maxDiscountVnd: null,
    startsAt: now,
    expiresAt: new Date(now.getTime() + policy.validDays * 86_400_000),
    usageLimit: 1,
    perCustomerLimit: 1,
  }
}

/** Đơn đủ điều kiện nhận mã: đã giao/hoàn tất, có khách đặt, tiệm bật tính năng. */
export function thankYouEligible(order: { status: string; deliveryStatus: string; customerId: string | null }, policy: ThankYouPolicy): boolean {
  if (!policy.enabled || !order.customerId || order.status === "CANCELLED") return false
  return order.deliveryStatus === "DELIVERED" || order.status === "COMPLETED"
}
