/**
 * Thời gian dùng được của link gửi khách (Điều hành cài trong Cài đặt Thẻ chào, áp dụng chung
 * cho cả tiệm). Link riêng tính từ lúc tạo; link chia sẻ `/s/` tính từ lúc từng khách mở.
 * Chỉ áp dụng cho link tạo sau khi đổi; link đã có đơn vẫn mở được để xem thanh toán/theo dõi.
 * Pure TypeScript.
 */

export const LINK_LIFETIME_SETTINGS_KEY = "brochure_link_lifetime_hours"
export const DEFAULT_LINK_LIFETIME_HOURS = 24
export const MIN_LINK_LIFETIME_HOURS = 1
export const MAX_LINK_LIFETIME_HOURS = 720

export function isValidLinkLifetimeHours(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= MIN_LINK_LIFETIME_HOURS && value <= MAX_LINK_LIFETIME_HOURS
}

/** Số giờ đã cài trong `organizations.settings`; chưa cài / sai → 24 giờ. */
export function parseLinkLifetimeHours(settings: unknown): number {
  const raw = settings && typeof settings === "object" ? (settings as Record<string, unknown>)[LINK_LIFETIME_SETTINGS_KEY] : undefined
  return isValidLinkLifetimeHours(raw) ? raw : DEFAULT_LINK_LIFETIME_HOURS
}

export function linkExpiryFrom(hours: number, now: Date = new Date()): Date {
  const h = isValidLinkLifetimeHours(hours) ? hours : DEFAULT_LINK_LIFETIME_HOURS
  return new Date(now.getTime() + h * 3_600_000)
}

/** "24 giờ", "3 ngày", "1 ngày 6 giờ" — để Điều hành và sale đọc nhanh. */
export function formatLinkLifetime(hours: number): string {
  const days = Math.floor(hours / 24)
  const rest = hours % 24
  if (days === 0) return `${hours} giờ`
  return rest === 0 ? `${days} ngày` : `${days} ngày ${rest} giờ`
}
