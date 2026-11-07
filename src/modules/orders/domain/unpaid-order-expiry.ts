/**
 * Tự huỷ đơn chưa thanh toán NGOÀI Thẻ chào (audit hành trình O10, gói UJ-12 — UQ5).
 *
 * Trước đây chỉ đơn Thẻ chào tự huỷ khi quá hạn giữ đơn; đơn đặt qua catalog / landing chưa chuyển khoản nằm ở
 * "Nháp" mãi, chiếm chỗ trong sổ đơn và không sinh lead cứu đơn. Công tắc theo cửa hàng, **mặc định tắt** (PO
 * bật khi chốt); bật thì mặc định 24 giờ, chỉ cho đơn khách tự đặt qua catalog/landing — đơn nhân viên nhập tay
 * và đơn từ báo giá không tự huỷ.
 */
export const UNPAID_EXPIRY_SETTINGS_KEY = "unpaid_order_auto_cancel"
export const UNPAID_EXPIRY_SOURCES = ["CATALOG", "LANDING"] as const
export const UNPAID_EXPIRY_DEFAULT_HOURS = 24
export const UNPAID_EXPIRY_MIN_HOURS = 2
export const UNPAID_EXPIRY_MAX_HOURS = 168

export interface UnpaidExpiryPolicy {
  enabled: boolean
  hours: number
}

export function parseUnpaidExpiryPolicy(settings: Record<string, unknown> | null | undefined): UnpaidExpiryPolicy {
  const raw = settings?.[UNPAID_EXPIRY_SETTINGS_KEY]
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  const hours = typeof obj.hours === "number" && Number.isFinite(obj.hours) ? Math.round(obj.hours) : UNPAID_EXPIRY_DEFAULT_HOURS
  return {
    enabled: obj.enabled === true,
    hours: Math.min(UNPAID_EXPIRY_MAX_HOURS, Math.max(UNPAID_EXPIRY_MIN_HOURS, hours)),
  }
}

/** Mốc: đơn tạo trước thời điểm này mà vẫn chưa thu đồng nào thì tự huỷ. */
export function unpaidExpiryCutoff(policy: UnpaidExpiryPolicy, now: Date): Date {
  return new Date(now.getTime() - policy.hours * 3_600_000)
}
