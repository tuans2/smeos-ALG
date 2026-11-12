/**
 * Định nghĩa kiểu dữ liệu & sự kiện thông báo cho nhân viên (Staff Notifications) Thẻ Chào.
 * Pure TypeScript — không phụ thuộc CSDL hay thư viện ngoài.
 */
import type { MessageRole } from "./internal-message"

export const STAFF_NOTIFY_EVENTS = [
  "ORDER_RECEIVED",
  "ORDER_ACCEPTED",
  "PAYMENT_REPORTED",
  "PAYMENT_CONFIRMED",
  "CANCELLATION_REQUESTED",
  "CHANGE_REQUESTED",
  "PHOTO_FEEDBACK",
  "READY",
  "DELIVERY_FAILED",
  "STUCK_DETECTED",
  "SECOND_PAYMENT_REPORTED",
  "DISCOUNT_REQUESTED",
  "PRODUCT_PROPOSED",
  "PRODUCT_PROPOSAL_REMINDER",
  "PRODUCT_PROPOSAL_REJECTED",
  "PRODUCT_PROPOSAL_EXPIRED",
  "PRODUCT_CHANGE_REQUESTED",
  "PRODUCT_CHANGE_REVIEWED",
] as const

export type StaffNotifyEvent = (typeof STAFF_NOTIFY_EVENTS)[number]

export const STAFF_NOTIFY_EVENT_LABELS: Record<StaffNotifyEvent, string> = {
  ORDER_RECEIVED: "Có đơn hàng mới",
  ORDER_ACCEPTED: "Đơn hàng đã được tiếp nhận — bắt đầu sản xuất",
  PAYMENT_REPORTED: "Khách báo đã chuyển khoản (lần 1)",
  PAYMENT_CONFIRMED: "Xác nhận chuyển khoản thành công",
  CANCELLATION_REQUESTED: "Khách yêu cầu huỷ đơn hàng",
  CHANGE_REQUESTED: "Khách yêu cầu thay đổi thông tin đơn",
  PHOTO_FEEDBACK: "Khách góp ý ảnh thành phẩm",
  READY: "Sản phẩm đã hoàn thiện, đã kiểm tra chất lượng",
  DELIVERY_FAILED: "Giao hàng chưa thành công",
  STUCK_DETECTED: "Đơn hàng kẹt quá thời gian xử lý",
  SECOND_PAYMENT_REPORTED: "Khách báo đã chuyển khoản lần 2 (đặt cọc)",
  DISCOUNT_REQUESTED: "Đề xuất giảm giá chờ duyệt",
  PRODUCT_PROPOSED: "Nhân viên đề xuất mẫu sản phẩm mới chờ duyệt",
  PRODUCT_PROPOSAL_REMINDER: "Nhắc duyệt mẫu đề xuất sắp hết hạn",
  PRODUCT_PROPOSAL_REJECTED: "Mẫu đề xuất của bạn bị từ chối",
  PRODUCT_PROPOSAL_EXPIRED: "Mẫu đề xuất của bạn hết hạn chưa được duyệt",
  PRODUCT_CHANGE_REQUESTED: "Nhân viên đề xuất sửa một mẫu chính thức",
  PRODUCT_CHANGE_REVIEWED: "Đề xuất sửa mẫu của bạn đã có kết quả",
}

export const STAFF_NOTIFY_CHANNELS = [
  "APP_INBOX",
  "ZALO",
  "SMS",
  "TELEGRAM",
  "WHATSAPP",
  "MESSENGER",
] as const

export type StaffNotifyChannel = (typeof STAFF_NOTIFY_CHANNELS)[number]

export const STAFF_NOTIFY_CHANNEL_LABELS: Record<StaffNotifyChannel, string> = {
  APP_INBOX: "Hộp việc trong ứng dụng",
  ZALO: "Zalo OA",
  SMS: "Tin nhắn SMS",
  TELEGRAM: "Telegram Bot",
  WHATSAPP: "WhatsApp",
  MESSENGER: "Facebook Messenger",
}

export type StaffNotifyPriority = "NORMAL" | "URGENT" | "CRITICAL"

export interface StaffRecipientTarget {
  role: MessageRole
  /**
   * "OWNER": chỉ gửi cho người phụ trách (VD: Sale tạo link)
   * "BROADCAST": gửi cho toàn bộ nhân sự có vai trò này
   */
  dispatchMode: "OWNER" | "BROADCAST"
  /** Các kênh được kích hoạt cho vai này đối với sự kiện này */
  channels: StaffNotifyChannel[]
  priority: StaffNotifyPriority
}

export interface StaffNotificationContext {
  orderId?: string | null
  orderCode?: string | null
  sessionId?: string | null
  customerName?: string | null
  customerPhone?: string | null
  productName?: string | null
  amountVnd?: number | null
  assignedSaleId?: string | null
  reason?: string | null
  extraNote?: string | null
  trackingUrl?: string | null
  industryKey?: string | null
  checkInDate?: string | null
  checkOutDate?: string | null
}

export interface ResolvedStaffNotificationTarget {
  role: MessageRole
  recipientUserId: string | null // null nghĩa là broadcast tới toàn bộ nhân viên có role này
  channels: StaffNotifyChannel[]
  priority: StaffNotifyPriority
  title: string
  message: string
}
