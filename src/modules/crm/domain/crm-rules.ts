/**
 * CRM Domain Rules (Luật nghiệp vụ Khách hàng & Tiếp thị ngành hoa).
 * Thuần túy logic, không import Prisma hay thư viện ngoài.
 */

import type { CustomerTier, CustomerConsentItem } from "./customer-master-index"
import {
  DEFAULT_CUSTOMER_TIER_THRESHOLDS,
  type CustomerTierThresholds,
} from "@/modules/organization/domain/industry-customer-tiers"

/**
 * Phân hạng khách hàng tự động theo RFM (Frequency & Monetary). Ngưỡng theo ngành của tiệm (PO 07/11/2026, Q6);
 * mặc định (ngành hoa): VIP ≥ 10.000.000 đ hoặc ≥ 10 đơn · GOLD ≥ 5 tr / 5 đơn · SILVER ≥ 2 tr / 3 đơn ·
 * BRONZE ≥ 500.000 đ / 1 đơn · NEW chưa phát sinh. `totalSpentVnd` là tiền ĐÃ THU, không gồm phần còn nợ.
 */
export function deriveCustomerTier(
  totalSpentVnd: number,
  orderCount: number,
  thresholds: CustomerTierThresholds = DEFAULT_CUSTOMER_TIER_THRESHOLDS
): CustomerTier {
  for (const tier of ["VIP", "GOLD", "SILVER", "BRONZE"] as const) {
    const t = thresholds[tier]
    if (totalSpentVnd >= t.spentVnd || orderCount >= t.orders) return tier
  }
  return "NEW"
}

/**
 * Giai đoạn vòng đời khách hàng ngành hoa (Customer Lifecycle Stage)
 * PO duyệt 27/09/2026: ACQUIRE, GROW, RETAIN, AT_RISK, DORMANT.
 */
export type CustomerLifecycleStage = "ACQUIRE" | "GROW" | "RETAIN" | "AT_RISK" | "DORMANT"

export interface CustomerLifecycleMetrics {
  orderCount: number
  totalSpentVnd: number
  tier?: CustomerTier | undefined
  lastOrderAt?: string | null | undefined
}

export function deriveCustomerLifecycleStage(
  metrics: CustomerLifecycleMetrics,
  now: Date = new Date()
): CustomerLifecycleStage {
  const { orderCount, totalSpentVnd, lastOrderAt } = metrics

  // Chưa từng có đơn hàng -> Giai đoạn Tiếp cận / Mới (ACQUIRE)
  if (orderCount === 0 || !lastOrderAt) {
    return "ACQUIRE"
  }

  const lastOrderDate = new Date(lastOrderAt)
  const diffMs = now.getTime() - lastOrderDate.getTime()
  const daysSinceLastOrder = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))

  // Khách giá trị cao = hạng Vàng trở lên. Hạng đã tính theo ngưỡng NGÀNH của tiệm (Q6) nên dùng hạng khi có; chưa có
  // hạng thì so ngưỡng Vàng mặc định — trước đây cứng 5 tr / 5 đơn của ngành hoa cho mọi ngành (audit BL-31)
  const gold = DEFAULT_CUSTOMER_TIER_THRESHOLDS.GOLD
  const isHighValue = metrics.tier
    ? metrics.tier === "GOLD" || metrics.tier === "VIP"
    : totalSpentVnd >= gold.spentVnd || orderCount >= gold.orders

  if (isHighValue) {
    if (daysSinceLastOrder <= 90) return "RETAIN"
    if (daysSinceLastOrder <= 180) return "AT_RISK"
    return "DORMANT"
  }

  // Khách mới 1 đơn
  if (orderCount === 1) {
    if (daysSinceLastOrder <= 30) return "ACQUIRE"
    if (daysSinceLastOrder <= 90) return "AT_RISK"
    return "DORMANT"
  }

  // Khách 2-4 đơn (đang phát triển)
  if (daysSinceLastOrder <= 60) return "GROW"
  if (daysSinceLastOrder <= 120) return "AT_RISK"
  return "DORMANT"
}

/**
 * Kiểm tra định dạng số điện thoại Việt Nam hợp lệ
 */
export function isValidVietnamesePhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s.-]/g, "")
  return /^(0|84|\+84)(3|5|7|8|9)[0-9]{8}$/.test(cleaned)
}

/**
 * Chuẩn hóa số điện thoại về định dạng 10 số (bắt đầu bằng 0)
 */
export function normalizeVietnamesePhone(phone: string): string {
  let cleaned = phone.replace(/[\s.-]/g, "")
  if (cleaned.startsWith("+84")) {
    cleaned = "0" + cleaned.slice(3)
  } else if (cleaned.startsWith("84")) {
    cleaned = "0" + cleaned.slice(2)
  }
  return cleaned
}

/**
 * Kiểm tra xem một dịp kỷ niệm có rơi vào khoảng `daysAhead` ngày tới không.
 * dateStr có thể là MM-DD hoặc YYYY-MM-DD.
 */
export function calculateDaysUntilOccasion(
  dateStr: string,
  now: Date = new Date()
): number | null {
  const parts = dateStr.split("-")
  if (parts.length < 2) return null

  const month = parseInt(parts[parts.length - 2] ?? "", 10) - 1
  const day = parseInt(parts[parts.length - 1] ?? "", 10)

  if (isNaN(month) || isNaN(day)) return null

  const currentYear = now.getFullYear()
  let targetDate = new Date(currentYear, month, day)

  // Đặt về 00:00:00 để so sánh chính xác theo ngày
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Nếu ngày trong năm nay đã trôi qua, tính cho năm sau
  if (targetDate.getTime() < today.getTime()) {
    targetDate = new Date(currentYear + 1, month, day)
  }

  const diffMs = targetDate.getTime() - today.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Kiểm tra quyền tiếp thị (Consent check) trước khi gửi tin
 */
export function hasMarketingConsent(
  consents: CustomerConsentItem[],
  channel: CustomerConsentItem["channel"]
): boolean {
  // MI-1 (ĐP-1.5, 26/09/2026): đã cấp nhưng đã bị thu hồi (`revokedAt`) thì
  // không còn hiệu lực — trước bản này hàm chỉ nhìn `granted`.
  const c = consents.find((it) => it.channel === channel)
  return Boolean(c?.granted) && !c?.revokedAt
}
