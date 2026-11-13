import { CATALOG_TIMEOUT_OVERRIDE_KEY } from "./step-timeout-policy"

/**
 * Khoá trong `greeting_catalogs.filters` ghi đè CHÍNH SÁCH của tiệm (bắt buộc ảnh bill, cơ chế duyệt
 * thanh toán, thời hạn tự huỷ). Đổi các khoá này cần quyền sửa cấu hình tiệm (F2), không chỉ quyền tạo đơn.
 */
export const CATALOG_POLICY_KEYS = [
  "requirePaymentProof",
  "trackingTriggerPolicy",
  "balancePaymentTriggerPolicy",
  CATALOG_TIMEOUT_OVERRIDE_KEY,
] as const

/** Có khoá chính sách nào đổi giá trị giữa `before` và `after` không. */
export function catalogPolicyKeysChanged(before: unknown, after: unknown): boolean {
  const a = before && typeof before === "object" ? (before as Record<string, unknown>) : {}
  const b = after && typeof after === "object" ? (after as Record<string, unknown>) : {}
  return CATALOG_POLICY_KEYS.some((k) => JSON.stringify(a[k] ?? null) !== JSON.stringify(b[k] ?? null))
}
