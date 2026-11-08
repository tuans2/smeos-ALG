/**
 * Nhãn tiếng Việt, trung tính theo ngành, cho ba trục trạng thái đơn — dùng trong thông điệp lỗi trả về giao diện
 * thay cho mã kỹ thuật (`CLAUDE.md` luật 6, audit BL-18).
 */

import type { DeliveryStatus, OrderStatus, ProductionStatus } from "./order-types"

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: "Nháp",
  CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang xử lý",
  DELIVERED: "Đã giao",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã huỷ",
}

export const PRODUCTION_STATUS_LABELS: Record<ProductionStatus, string> = {
  WAITING: "Chờ làm",
  ASSIGNED: "Đã phân công",
  ARRANGING: "Đang làm",
  QUALITY_CHECK: "Kiểm tra chất lượng",
  READY: "Đã xong",
}

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  PENDING: "Chờ giao",
  DISPATCHED: "Đã bàn giao vận chuyển",
  DELIVERING: "Đang giao",
  DELIVERED: "Đã giao",
  FAILED: "Giao thất bại",
}
