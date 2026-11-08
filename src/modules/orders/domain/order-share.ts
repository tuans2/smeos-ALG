/**
 * ADR-014 D-P6, bước P-4 (PO duyệt 07/11/2026): hiệu lực của một quyền xem đơn (`shared_order_access`).
 * - Đã thu hồi → hết.
 * - `INVITED` (được mời, chưa nhận): hết ngay khi đơn đóng.
 * - `ASSIGNED` (đang làm đơn): còn 7 ngày sau khi đơn đóng — đủ cho khiếu nại sau giao và đối soát thù lao.
 * Đơn "đóng" = hoàn tất, huỷ, hoặc đã giao xong. Pure TypeScript.
 */

export const SHARE_AFTER_CLOSE_DAYS = 7

export interface OrderShareFacts {
  level: "INVITED" | "ASSIGNED"
  revokedAt: Date | null
}

export interface OrderCloseFacts {
  status: string
  deliveryStatus: string
  /** Lúc đơn đóng (sự kiện đầu tiên hoàn tất/huỷ/giao xong); null khi chưa đóng hoặc không rõ */
  closedAt: Date | null
}

export function isOrderClosed(order: Pick<OrderCloseFacts, "status" | "deliveryStatus">): boolean {
  return order.status === "COMPLETED" || order.status === "CANCELLED" || order.deliveryStatus === "DELIVERED"
}

export function isShareActive(share: OrderShareFacts | null, order: OrderCloseFacts, now: Date): boolean {
  if (!share || share.revokedAt) return false
  if (!isOrderClosed(order)) return true
  if (share.level === "INVITED") return false
  const closedAt = order.closedAt ?? now
  return now.getTime() < closedAt.getTime() + SHARE_AFTER_CLOSE_DAYS * 86_400_000
}
