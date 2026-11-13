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

/**
 * Đơn có sản phẩm theo dõi tồn theo số lượng đang giữ hàng ngay lúc đặt (Q9) → tự huỷ riêng, **mặc định bật**, 2 giờ
 * (PO 12/11/2026, audit BL-26). Tiệm chỉnh 2–24 giờ hoặc tắt. Trước đây đơn chưa trả đồng nào giữ tồn vô hạn.
 */
export const STOCK_HOLD_DEFAULT_HOURS = 2
export const STOCK_HOLD_MAX_HOURS = 24

export interface UnpaidExpiryPolicy {
  enabled: boolean
  hours: number
  /** Đơn giữ tồn: bật/tắt riêng, mặc định bật. */
  stockHoldEnabled: boolean
  stockHoldHours: number
}

const hoursOf = (v: unknown, fallback: number, min: number, max: number) =>
  Math.min(max, Math.max(min, typeof v === "number" && Number.isFinite(v) ? Math.round(v) : fallback))

export function parseUnpaidExpiryPolicy(settings: Record<string, unknown> | null | undefined): UnpaidExpiryPolicy {
  const raw = settings?.[UNPAID_EXPIRY_SETTINGS_KEY]
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  return {
    enabled: obj.enabled === true,
    hours: hoursOf(obj.hours, UNPAID_EXPIRY_DEFAULT_HOURS, UNPAID_EXPIRY_MIN_HOURS, UNPAID_EXPIRY_MAX_HOURS),
    stockHoldEnabled: obj.stockHoldEnabled !== false,
    stockHoldHours: hoursOf(obj.stockHoldHours, STOCK_HOLD_DEFAULT_HOURS, UNPAID_EXPIRY_MIN_HOURS, STOCK_HOLD_MAX_HOURS),
  }
}

/** Mốc: đơn tạo trước thời điểm này mà vẫn chưa thu đồng nào thì tự huỷ. */
export function unpaidExpiryCutoff(policy: Pick<UnpaidExpiryPolicy, "hours">, now: Date): Date {
  return new Date(now.getTime() - policy.hours * 3_600_000)
}

/** Mốc cho đơn đang giữ tồn; `null` khi tiệm tắt. */
export function stockHoldCutoff(policy: UnpaidExpiryPolicy, now: Date): Date | null {
  return policy.stockHoldEnabled ? new Date(now.getTime() - policy.stockHoldHours * 3_600_000) : null
}

/**
 * Khách có thể đã chuyển khoản mà nội dung không ghi mã đơn: có giao dịch ngân hàng chưa khớp, đúng số tiền của đơn, đến
 * sau lúc đặt → không tự huỷ, để người xem xét (PO 12/11/2026).
 */
export function hasLikelyUnmatchedPayment(
  order: { totalVnd: number; createdAt: Date },
  unmatched: ReadonlyArray<{ amountVnd: number; at: Date }>,
): boolean {
  return unmatched.some((e) => e.amountVnd === order.totalVnd && e.at.getTime() >= order.createdAt.getTime())
}
