/**
 * Vòng đời gói thuê bao (checklist ALG 10.7, PO Q9) — luật thuần.
 *
 * - Chu kỳ tháng hoặc năm; giá theo kỳ nhập ở Console.
 * - Hoá đơn kỳ sau sinh 7 ngày trước khi kỳ hiện tại kết thúc, hạn trả = ngày bắt đầu kỳ sau; nhắc 7 ngày và 1 ngày.
 * - Có hoá đơn chưa thu đã tới hạn → tổ chức chỉ xem dữ liệu NGAY (không ân hạn); thu xong mở lại.
 * - Credit tặng theo gói cấp đầu mỗi tháng; phần chưa dùng hết hạn cuối tháng (PO Q10).
 */

export type SubscriptionCycle = "MONTHLY" | "YEARLY"
export const SUBSCRIPTION_PLANS = ["EXPERIENCE", "STARTER", "PRO", "FLOWER_NETWORK", "ENTERPRISE"] as const
export type SubscriptionPlanCode = (typeof SUBSCRIPTION_PLANS)[number]
export const PLAN_LABEL: Record<SubscriptionPlanCode, string> = {
  EXPERIENCE: "Trải nghiệm", STARTER: "Starter", PRO: "Pro", FLOWER_NETWORK: "Mạng lưới", ENTERPRISE: "Doanh nghiệp",
}

export const RENEWAL_NOTICE_DAYS = 7
const DAY_MS = 86_400_000
export const INVOICE_CODE_PREFIX = "TB"
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
export const INVOICE_CODE_LENGTH = 8

export function isPlanCode(v: unknown): v is SubscriptionPlanCode {
  return typeof v === "string" && (SUBSCRIPTION_PLANS as readonly string[]).includes(v)
}

/**
 * Cộng một kỳ; ngày neo (mặc định ngày của `from`) rơi vào tháng ngắn hơn thì lùi về ngày cuối tháng. Truyền ngày neo
 * của hoá đơn đầu tiên để kỳ sau quay lại đúng ngày đó (31/01 → 28/02 → 31/03), không neo vĩnh viễn ngày 28 (BL-27).
 */
export function addCycle(from: Date, cycle: SubscriptionCycle, anchorDay: number = from.getUTCDate()): Date {
  const d = new Date(from.getTime())
  const day = Math.min(31, Math.max(1, Math.floor(anchorDay)))
  d.setUTCDate(1)
  if (cycle === "YEARLY") d.setUTCFullYear(d.getUTCFullYear() + 1)
  else d.setUTCMonth(d.getUTCMonth() + 1)
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(day, last))
  return d
}

/**
 * Mã hoá đơn TB + 8 ký tự (bỏ 0/O/1/I để đọc không nhầm). `indices`: 8 chỉ số trong [0, độ dài bảng chữ),
 * bên gọi sinh bằng `crypto.randomInt` (phân bố đều).
 */
export function formatInvoiceCode(indices: readonly number[]): string {
  if (indices.length !== INVOICE_CODE_LENGTH || indices.some((i) => !Number.isInteger(i) || i < 0 || i >= CODE_ALPHABET.length)) {
    throw new RangeError("Chỉ số mã hoá đơn không hợp lệ")
  }
  return INVOICE_CODE_PREFIX + indices.map((i) => CODE_ALPHABET[i]).join("")
}

/** Tìm mã hoá đơn trong nội dung chuyển khoản (ngân hàng có thể thêm khoảng trắng, đổi chữ hoa). */
export function findInvoiceCode(content: string): string | null {
  const compact = content.toUpperCase().replace(/[^A-Z0-9]/g, "")
  const m = new RegExp(`${INVOICE_CODE_PREFIX}[${CODE_ALPHABET}]{8}`).exec(compact)
  return m ? m[0] : null
}

export const renewalOpensAt = (periodEnd: Date) => new Date(periodEnd.getTime() - RENEWAL_NOTICE_DAYS * DAY_MS)
export const reminderDue = (dueAt: Date, days: 7 | 1, now: Date) => now.getTime() >= dueAt.getTime() - days * DAY_MS

/** Credit tặng theo gói còn thừa cuối tháng: phần dùng trong tháng trừ vào credit tặng trước. */
export function expiringPlanCredit(granted: number, usedInPeriod: number, balance: number): number {
  return Math.max(0, Math.min(balance, granted - Math.max(0, usedInPeriod)))
}
