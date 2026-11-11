import { formatTime, formatDate } from "@/lib/i18n/formatters"

export interface CatalogOption {
  id: string
  name: string
  code: string
}

export interface SessionRow {
  id: string
  send_code: string
  customer_name: string | null
  customer_phone: string | null
  status: string
  order_id: string | null
  expires_at: string | null
  link_state: "ACTIVE" | "EXPIRED" | "REVOKED"
  last_active_at: string
  catalog: { id: string; name: string; code: string }
  order: { id: string; code: string; status: string; total_vnd: number; paid_vnd: number } | null
}

export function getSessionStatusBadge(status: string, sampleProductTerm?: string): { label: string; className: string } {
  const itemLabel = (sampleProductTerm || "sản phẩm").replace(/ chuẩn$/i, "").toLowerCase()
  const badges: Record<string, { label: string; className: string }> = {
    CREATED: { label: "Chưa mở link", className: "bg-surface-muted text-text-muted" },
    OPENED: { label: `Đang xem ${itemLabel}`, className: "bg-warning/15 text-warning-text" },
    BROWSING: { label: `Đang xem ${itemLabel}`, className: "bg-warning/15 text-warning-text" },
    SELECTED: { label: `Đã chọn ${itemLabel}`, className: "bg-primary/10 text-primary" },
    ORDER_SUBMITTED: { label: "Đã tạo đơn hàng", className: "bg-info-bg text-info" },
    PAYMENT_REPORTED: { label: "Khách báo đã chuyển tiền", className: "bg-warning-bg text-warning-text" },
    COMPLETED: { label: "Đã xác nhận thanh toán", className: "bg-success-bg text-success" },
  }
  return badges[status] ?? { label: status, className: "bg-surface-muted" }
}

export const SESSION_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  CREATED: { label: "Chưa mở link", className: "bg-surface-muted text-text-muted" },
  OPENED: { label: "Đang xem mẫu", className: "bg-warning/15 text-warning-text" },
  BROWSING: { label: "Đang xem mẫu", className: "bg-warning/15 text-warning-text" },
  SELECTED: { label: "Đã chọn mẫu", className: "bg-primary/10 text-primary" },
  ORDER_SUBMITTED: { label: "Đã tạo đơn hàng", className: "bg-info-bg text-info" },
  PAYMENT_REPORTED: { label: "Khách báo đã chuyển tiền", className: "bg-warning-bg text-warning-text" },
  COMPLETED: { label: "Đã xác nhận thanh toán", className: "bg-success-bg text-success" },
}

/** Hạn dùng link do Điều hành cài cho cả tiệm — sale không tự chọn. */
export const LINK_LIFETIME_HINT =
  "Link tự hết hạn theo thời gian Điều hành cài trong Cài đặt Bộ sưu tập riêng (mặc định 24 giờ). Link đã có đơn luôn mở được để khách theo dõi."

/** "Dùng được đến 14:30 07/10" */
export function linkExpiryLabel(expiresAt: string | null | undefined): string | null {
  if (!expiresAt) return null
  const d = new Date(expiresAt)
  return `Link dùng được đến ${formatTime(d)} ${formatDate(d)}`
}
