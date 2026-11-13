/**
 * Phát hành mã giảm giá (PO 30/10/2026) — luật thuần cho một đợt phát hành.
 *
 * Hai kiểu đợt:
 * - SHARED — một mã chung (vd. TET2027) nhiều khách cùng dùng, giới hạn tổng lượt.
 * - UNIQUE — nhiều mã riêng sinh ngẫu nhiên (vd. 200 mã in lên thiệp), mỗi mã vài lượt.
 *
 * Mỗi đợt có thể gắn một ưu đãi trong danh mục ưu đãi của tiệm: tắt ưu đãi đó (công tắc ở
 * ma trận ưu đãi) hoặc tầng trên khoá nó thì mọi mã của đợt ngừng nhận — một công tắc duy nhất.
 * Pure TypeScript.
 */

import { formatCurrency } from "@/lib/i18n/formatters"

export type VoucherDiscountType = "PERCENTAGE" | "FIXED_AMOUNT"
export type VoucherBatchMode = "SHARED" | "UNIQUE"

export const MAX_BATCH_QUANTITY = 1000
export const MAX_DISCOUNT_VND = 1_000_000_000
export const CODE_RANDOM_LENGTH = 8
/** Bỏ các ký tự dễ đọc nhầm (0/O, 1/I/L) — khách gõ lại mã từ thiệp in. */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
const CODE_PATTERN = /^[A-Z0-9-]{3,32}$/
const PREFIX_PATTERN = /^[A-Z0-9]{1,10}$/

export interface VoucherBatchInput {
  name: string
  mode: VoucherBatchMode
  /** SHARED: mã chung do tiệm đặt */
  sharedCode: string | null
  /** UNIQUE: tiền tố trước phần ngẫu nhiên */
  codePrefix: string | null
  /** UNIQUE: số mã cần sinh; SHARED luôn là 1 */
  quantity: number
  promotionId: string | null
  discountType: VoucherDiscountType
  discountValue: number
  minOrderVnd: number
  maxDiscountVnd: number | null
  startsAt: Date | null
  expiresAt: Date | null
  /** Tổng lượt dùng của MỖI mã; null = không giới hạn */
  usageLimit: number | null
  perCustomerLimit: number | null
}

export interface BatchPolicy {
  /** Trần % giảm đang áp (khoá nền tảng); null = không trần */
  maxDiscountPercent: number | null
  /** Ưu đãi đang bật mà đợt được phép gắn vào */
  activePromotionIds: ReadonlySet<string>
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase()
}

const positiveInt = (v: number | null) => v === null || (Number.isInteger(v) && v >= 1 && v <= 1_000_000)

/** Lỗi theo trường (tiếng Việt); rỗng = hợp lệ. */
export function validateVoucherBatch(input: VoucherBatchInput, policy: BatchPolicy): Record<string, string> {
  const errors: Record<string, string> = {}
  const name = input.name.trim()
  if (name.length < 2 || name.length > 120) errors.name = "Tên đợt phát hành cần từ 2 đến 120 ký tự"

  if (input.mode === "SHARED") {
    const code = normalizeCode(input.sharedCode ?? "")
    if (!CODE_PATTERN.test(code)) errors.sharedCode = "Mã chỉ gồm chữ không dấu, số hoặc dấu gạch, dài 3–32 ký tự"
  } else {
    if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > MAX_BATCH_QUANTITY) {
      errors.quantity = `Số mã cần từ 1 đến ${MAX_BATCH_QUANTITY}`
    }
    const prefix = normalizeCode(input.codePrefix ?? "")
    if (prefix && !PREFIX_PATTERN.test(prefix)) errors.codePrefix = "Tiền tố chỉ gồm chữ không dấu hoặc số, tối đa 10 ký tự"
  }

  if (input.discountType === "PERCENTAGE") {
    const cap = policy.maxDiscountPercent ?? 100
    if (!(input.discountValue > 0 && input.discountValue <= cap)) errors.discountValue = `Mức giảm cần lớn hơn 0% và không quá ${cap}%`
  } else if (!(Number.isInteger(input.discountValue) && input.discountValue > 0 && input.discountValue <= MAX_DISCOUNT_VND)) {
    errors.discountValue = "Số tiền giảm cần là số nguyên dương"
  }
  if (!(Number.isInteger(input.minOrderVnd) && input.minOrderVnd >= 0 && input.minOrderVnd <= MAX_DISCOUNT_VND)) {
    errors.minOrderVnd = "Giá trị đơn tối thiểu không hợp lệ"
  }
  if (input.maxDiscountVnd !== null && !(Number.isInteger(input.maxDiscountVnd) && input.maxDiscountVnd > 0)) {
    errors.maxDiscountVnd = "Mức giảm tối đa cần là số nguyên dương"
  }
  if (input.startsAt && input.expiresAt && input.expiresAt.getTime() <= input.startsAt.getTime()) {
    errors.expiresAt = "Ngày hết hạn phải sau ngày bắt đầu"
  }
  if (!positiveInt(input.usageLimit)) errors.usageLimit = "Số lượt dùng cần là số nguyên dương"
  if (!positiveInt(input.perCustomerLimit)) errors.perCustomerLimit = "Số lượt mỗi khách cần là số nguyên dương"
  if (input.usageLimit !== null && input.perCustomerLimit !== null && input.perCustomerLimit > input.usageLimit) {
    errors.perCustomerLimit = "Lượt mỗi khách không được lớn hơn tổng lượt"
  }
  if (input.promotionId !== null && !policy.activePromotionIds.has(input.promotionId)) {
    errors.promotionId = "Ưu đãi này đang tắt hoặc không còn trong danh mục ưu đãi"
  }
  return errors
}

/** Một mã ngẫu nhiên; `random` trả số trong [0, 1) — truyền vào để test được. */
export function randomCode(prefix: string | null, random: () => number): string {
  let body = ""
  for (let i = 0; i < CODE_RANDOM_LENGTH; i++) body += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)]
  const p = normalizeCode(prefix ?? "")
  return p ? `${p}-${body}` : body
}

/** `count` mã khác nhau, không trùng `taken`. */
export function generateCodes(prefix: string | null, count: number, taken: ReadonlySet<string>, random: () => number): string[] {
  const out = new Set<string>()
  // Không gian 31^8 nên trùng là cực hiếm; vẫn chặn vòng lặp để không treo nếu `random` hỏng
  for (let tries = 0; out.size < count && tries < count * 20; tries++) {
    const code = randomCode(prefix, random)
    if (!taken.has(code)) out.add(code)
  }
  return [...out]
}

export type VoucherBatchStatus = "ACTIVE" | "SCHEDULED" | "EXPIRED" | "PAUSED" | "EXHAUSTED"

export const VOUCHER_BATCH_STATUS_LABEL: Record<VoucherBatchStatus, string> = {
  ACTIVE: "Đang dùng được",
  SCHEDULED: "Chưa đến ngày",
  EXPIRED: "Đã hết hạn",
  PAUSED: "Đang tạm dừng",
  EXHAUSTED: "Đã dùng hết",
}

export function voucherBatchStatus(
  b: { isActive: boolean; startsAt: Date | null; expiresAt: Date | null; codeCount: number; exhaustedCount: number },
  now: Date = new Date(),
): VoucherBatchStatus {
  if (!b.isActive) return "PAUSED"
  if (b.expiresAt && b.expiresAt.getTime() <= now.getTime()) return "EXPIRED"
  if (b.startsAt && b.startsAt.getTime() > now.getTime()) return "SCHEDULED"
  if (b.codeCount > 0 && b.exhaustedCount >= b.codeCount) return "EXHAUSTED"
  return "ACTIVE"
}

/** Nhãn mức giảm ngắn: "Giảm 10% (tối đa 50.000 ₫)" / "Giảm 30.000 ₫". */
export function discountLabel(type: VoucherDiscountType, value: number, maxDiscountVnd: number | null): string {
  if (type === "FIXED_AMOUNT") return `Giảm ${formatCurrency(value)}`
  return maxDiscountVnd ? `Giảm ${value}% (tối đa ${formatCurrency(maxDiscountVnd)})` : `Giảm ${value}%`
}

/** Một dòng CSV an toàn: bọc ngoặc kép và chặn công thức khi mở bằng Excel. */
export function csvCell(value: string | number | null): string {
  const s = value === null ? "" : String(value)
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s
  return `"${safe.replace(/"/g, '""')}"`
}
