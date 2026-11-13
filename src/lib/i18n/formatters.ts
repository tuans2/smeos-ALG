/**
 * formatters.ts — SSOT cho việc định dạng tiền tệ, ngày giờ, số lượng theo Locale chuẩn
 * Tuân thủ DOC-ARCH-I18N-001 & DOC-ARCH-L10N-001.
 */

import type { SupportedLocale } from "./types"

export const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh"

const LOCALE_MAP: Record<SupportedLocale, string> = {
  vi: "vi-VN",
  en: "en-US",
}

/**
 * Định dạng tiền tệ an toàn theo locale và đơn vị tiền
 * Mặc định cho ALG là VND
 */
export function formatCurrency(
  amount: number | null | undefined,
  locale: SupportedLocale = "vi",
  currency = "VND"
): string {
  const value = amount ?? 0
  const intlLocale = LOCALE_MAP[locale] ?? "vi-VN"

  if (currency === "VND") {
    // Với VND: tiếng Việt hiển thị "100.000 ₫", tiếng Anh hiển thị "100,000 VND"
    if (locale === "vi") {
      return new Intl.NumberFormat("vi-VN").format(Math.round(value)) + " ₫"
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value)
  }

  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency,
  }).format(value)
}

/**
 * Định dạng số nguyên hoặc số thập phân theo quy ước phân cách hàng ngàn của locale
 */
export function formatNumber(
  value: number | null | undefined,
  locale: SupportedLocale = "vi",
  options?: Intl.NumberFormatOptions
): string {
  const num = value ?? 0
  const intlLocale = LOCALE_MAP[locale] ?? "vi-VN"
  return new Intl.NumberFormat(intlLocale, options).format(num)
}

/**
 * Định dạng ngày tháng năm theo chuẩn của locale
 */
export function formatDate(
  date: Date | string | number | null | undefined,
  locale: SupportedLocale = "vi",
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return ""
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ""

  const intlLocale = LOCALE_MAP[locale] ?? "vi-VN"
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...options,
  }

  return new Intl.DateTimeFormat(intlLocale, defaultOptions).format(d)
}

/**
 * Định dạng giờ và phút theo chuẩn của locale
 */
export function formatTime(
  date: Date | string | number | null | undefined,
  locale: SupportedLocale = "vi",
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return ""
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ""

  const intlLocale = LOCALE_MAP[locale] ?? "vi-VN"
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: DEFAULT_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  }

  return new Intl.DateTimeFormat(intlLocale, defaultOptions).format(d)
}

/**
 * Định dạng cả ngày và giờ kết hợp
 */
export function formatDateTime(
  date: Date | string | number | null | undefined,
  locale: SupportedLocale = "vi"
): string {
  if (!date) return ""
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ""

  const dateStr = formatDate(d, locale)
  const timeStr = formatTime(d, locale)

  return locale === "vi" ? `${timeStr} ${dateStr}` : `${dateStr} at ${timeStr}`
}

