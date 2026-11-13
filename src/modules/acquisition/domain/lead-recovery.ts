/**
 * Đơn bị tự huỷ vì quá hạn thanh toán → trả về lead để Sale cứu đơn (PO 31/10/2026,
 * `docs/kien-truc/KIEN_TRUC_SSOT_DON_HANG_DA_NGUON.md` §3.1 mục 7). Pure TypeScript.
 *
 * Chỉ THÊM lead SAU khi đơn đã huỷ như cũ — không đổi lúc huỷ, lý do huỷ, audit hay trạng thái phiên
 * Thẻ chào (B1). Bộ quét chỉ đọc `order_events` mà luồng huỷ hiện hành đã ghi.
 */

export const PAYMENT_TIMEOUT_LEAD_REASON = "PAYMENT_TIMEOUT"
/**
 * Cơ sở liên hệ: khách đã tự để lại SĐT khi đặt đơn này (không phải form đồng ý riêng). Ghi phiên bản
 * riêng để tách khỏi lead đồng ý qua form (`LEAD_CONSENT_VERSION`) — cơ chế đồng ý chung còn treo ở D13.
 */
export const RECOVERY_CONSENT_VERSION = "ORDER_PLACED"
/** Chỉ quét đơn huỷ trong khoảng này — lượt quét lỡ (máy chủ khởi động lại) vẫn bắt lại được. */
export const RECOVERY_LOOKBACK_MS = 24 * 60 * 60 * 1000
export const RECOVERY_BATCH = 100
import { OPEN_LEAD_STATUSES } from "./lead-rules"
export { OPEN_LEAD_STATUSES }

export interface CancelledOrderCandidate {
  organizationId: string
  orderId: string
  orderCode: string
  /** `orders.source` — ghi làm nguồn lead (vd. BROCHURE). */
  source: string | null
  customerId: string | null
  customerName: string | null
  customerPhone: string | null
  /** Sale phụ trách: `orders.owner_sale_id` hoặc sale của phiên Thẻ chào. */
  saleId: string | null
  orderCreatedAt: Date
  /** Đã có lead cứu đơn cho chính đơn này (chống tạo lặp mỗi lượt quét). */
  hasRecoveryLead: boolean
  /** Khách đã có lead đang mở — một SĐT chỉ một lead mở mỗi tổ chức (§3.3). */
  hasOpenLeadForPhone: boolean
}

export interface RecoveryLeadRow {
  organizationId: string
  customerId: string | null
  name: string
  phone: string
  message: string
  source: string
  sourceRef: string
  assigneeUserId: string | null
  consentAt: Date
  consentVersion: string
  reason: typeof PAYMENT_TIMEOUT_LEAD_REASON
}

export type RecoveryPlan =
  | { action: "CREATE"; row: RecoveryLeadRow }
  | { action: "SKIP"; why: "ALREADY_RECOVERED" | "NO_PHONE" | "OPEN_LEAD_EXISTS" }

export function planRecoveryLead(c: CancelledOrderCandidate): RecoveryPlan {
  if (c.hasRecoveryLead) return { action: "SKIP", why: "ALREADY_RECOVERED" }
  const phone = c.customerPhone?.trim()
  if (!phone) return { action: "SKIP", why: "NO_PHONE" }
  if (c.hasOpenLeadForPhone) return { action: "SKIP", why: "OPEN_LEAD_EXISTS" }
  return {
    action: "CREATE",
    row: {
      organizationId: c.organizationId,
      customerId: c.customerId,
      name: c.customerName?.trim() || "Khách đặt đơn",
      phone,
      message: `Đơn ${c.orderCode} bị huỷ vì quá hạn thanh toán — liên hệ lại để giữ đơn cho khách.`,
      source: c.source || "MANUAL",
      sourceRef: c.orderId,
      assigneeUserId: c.saleId,
      consentAt: c.orderCreatedAt,
      consentVersion: RECOVERY_CONSENT_VERSION,
      reason: PAYMENT_TIMEOUT_LEAD_REASON,
    },
  }
}
