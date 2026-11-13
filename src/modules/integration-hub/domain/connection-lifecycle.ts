/**
 * Vòng đời một kết nối tích hợp — máy trạng thái thuần.
 *
 *   DRAFT → CONNECTING → ACTIVE ⇄ DEGRADED
 *   ACTIVE/DEGRADED → EXPIRED | ERROR → CONNECTING (kết nối lại)
 *   * → DISCONNECTED ;  * ⇄ DISABLED_BY_UPPER (tầng trên khoá / mở)
 */

export type ConnectionStatus =
  | "DRAFT"
  | "CONNECTING"
  | "ACTIVE"
  | "DEGRADED"
  | "EXPIRED"
  | "ERROR"
  | "DISCONNECTED"
  | "DISABLED_BY_UPPER"

const TRANSITIONS: Readonly<Record<ConnectionStatus, readonly ConnectionStatus[]>> = {
  DRAFT: ["CONNECTING", "ACTIVE", "ERROR", "DISCONNECTED"],
  CONNECTING: ["ACTIVE", "ERROR", "DISCONNECTED"],
  ACTIVE: ["DEGRADED", "EXPIRED", "ERROR", "DISCONNECTED", "DISABLED_BY_UPPER", "ACTIVE"],
  DEGRADED: ["ACTIVE", "EXPIRED", "ERROR", "DISCONNECTED", "DISABLED_BY_UPPER", "DEGRADED"],
  EXPIRED: ["CONNECTING", "ACTIVE", "DISCONNECTED", "DISABLED_BY_UPPER"],
  ERROR: ["CONNECTING", "ACTIVE", "DISCONNECTED", "DISABLED_BY_UPPER"],
  DISCONNECTED: ["CONNECTING", "ACTIVE"],
  DISABLED_BY_UPPER: ["ACTIVE", "DISCONNECTED"],
}

export function canTransition(from: ConnectionStatus, to: ConnectionStatus): boolean {
  return TRANSITIONS[from].includes(to)
}

/** Kết nối đang dùng được để gửi/nhận. */
export function isUsable(status: ConnectionStatus): boolean {
  return status === "ACTIVE" || status === "DEGRADED"
}

/** Kết nối cần người dùng xử lý (hiện ở thẻ "Cần xử lý"). */
export function needsAttention(status: ConnectionStatus): boolean {
  return status === "EXPIRED" || status === "ERROR" || status === "DEGRADED"
}

/** Kết quả kiểm tra sức khoẻ → trạng thái mới. */
export function statusAfterHealthCheck(
  current: ConnectionStatus,
  result: { ok: boolean; expired?: boolean; transient?: boolean }
): ConnectionStatus {
  if (!isUsable(current) && current !== "EXPIRED" && current !== "ERROR") return current
  if (result.ok) return "ACTIVE"
  if (result.expired) return "EXPIRED"
  if (result.transient) return current === "ACTIVE" ? "DEGRADED" : current === "DEGRADED" ? "ERROR" : current
  return "ERROR"
}
