/**
 * Hành động được mở ở chi tiết đơn của sổ đơn (PO 07/11/2026, Q8; nợ #150). Thuần.
 *  - Huỷ: chưa kết thúc và chưa giao (đã giao → mở sự cố ở Điều phối, audit BL-04).
 *  - Đơn đã xác nhận trở đi và chưa kết thúc → theo dõi ở Điều phối: mọi đơn xác nhận đều được chuyển sang Điều phối,
 *    và chỉ ở đó tiến độ đổi kèm bằng chứng và giữ bước điều phối khớp ba trục. Sổ đơn không có nút đổi tiến độ.
 */

import type { DeliveryStatus, OrderStatus } from "./order-types"

export interface OrderBookActions {
  canCancel: boolean
  followInCoordinator: boolean
}

const ENDED: readonly OrderStatus[] = ["COMPLETED", "CANCELLED"]

export function orderBookActions(order: { status: OrderStatus; deliveryStatus: DeliveryStatus }): OrderBookActions {
  const ended = ENDED.includes(order.status)
  const delivered = order.status === "DELIVERED" || order.deliveryStatus === "DELIVERED"
  return {
    canCancel: !ended && !delivered,
    followInCoordinator: !ended && order.status !== "DRAFT",
  }
}
