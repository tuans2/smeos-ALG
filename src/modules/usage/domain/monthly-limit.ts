/**
 * Hạn mức credit theo tháng và cảnh báo (checklist ALG 10.3, 9.7, 10.5) — luật thuần.
 *
 * PO Q10: mọi dịch vụ quy đổi về credit, một số dư chung. Hạn mức `CREDIT` (Console đặt) chặn tổng credit
 * dùng trong tháng; trần `AI` (cửa hàng đặt) chỉ chặn phần dịch vụ AI. Báo Điều hành khi dùng tới 80%
 * hạn mức, dừng ở 100%; báo sắp hết credit khi số dư dưới 20% lần nạp gần nhất (hoặc hạn mức tháng).
 */

export const LIMIT_SERVICES = ["CREDIT", "AI"] as const
export type LimitService = (typeof LIMIT_SERVICES)[number]

export const DEFAULT_PERIOD = "DEFAULT"
export const NEAR_LIMIT_RATIO = 0.8
export const LOW_BALANCE_RATIO = 0.2
export const MAX_MONTHLY_LIMIT = 10_000_000

/** Kỳ YYYY-MM theo giờ Việt Nam (UTC+7). */
export function creditPeriod(now: Date = new Date()): string {
  const vn = new Date(now.getTime() + 7 * 3_600_000)
  return `${vn.getUTCFullYear()}-${String(vn.getUTCMonth() + 1).padStart(2, "0")}`
}

/** Hạn mức hợp lệ: null (không giới hạn) hoặc số nguyên 0..MAX. */
export function parseMonthlyLimit(raw: unknown): number | null | undefined {
  if (raw === null) return null
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0 || raw > MAX_MONTHLY_LIMIT) return undefined
  return raw
}

export function reachesNearLimit(used: number, limit: number | null): boolean {
  return limit !== null && limit > 0 && used >= Math.ceil(limit * NEAR_LIMIT_RATIO)
}

/** Ngưỡng báo sắp hết: 20% lần nạp gần nhất, không có thì 20% hạn mức tháng; null = không xét. */
export function lowBalanceThreshold(lastTopup: number | null, monthlyLimit: number | null): number | null {
  const base = lastTopup && lastTopup > 0 ? lastTopup : monthlyLimit && monthlyLimit > 0 ? monthlyLimit : null
  return base === null ? null : Math.floor(base * LOW_BALANCE_RATIO)
}
