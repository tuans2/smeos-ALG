import type { CoordinatorAction } from "./brochure-commerce-rules"

/**
 * Nút trên thẻ đơn ở tab Điều phối (Lưới thẻ) — chỉ hiện việc làm được ở bước hiện tại (PO 16/10/2026).
 * Trước đây thẻ nào cũng hiện đủ các nút và làm mờ nút sai bước. Ngoại lệ: hoa đã cắm xong mà còn
 * chờ (thanh toán lần 2, khách duyệt ảnh) → vẫn hiện "Giao Ship" ở dạng mờ kèm lý do, vì đó là việc kế tiếp.
 * Pure TypeScript — máy chủ vẫn kiểm từng tác vụ.
 */
export const COORDINATOR_CARD_ACTIONS: readonly CoordinatorAction[] = [
  "assign-florist", "product-photo", "dispatch-shipping", "recipient-photo", "delivery-failed",
]

export interface CardActionView {
  action: CoordinatorAction
  /** `null` = bấm được; có lý do = hiện mờ kèm lý do */
  blocker: string | null
}

export function visibleCoordinatorActions(
  blockerOf: (action: CoordinatorAction) => string | null,
  s: { status: string; productionStatus: string; deliveryStatus: string },
): CardActionView[] {
  const shipped = s.deliveryStatus === "DISPATCHED" || s.deliveryStatus === "DELIVERING"
  const finished = s.status === "CANCELLED" || s.status === "COMPLETED" || s.deliveryStatus === "DELIVERED"
  const readyToShip = !finished && !shipped && (s.productionStatus === "READY" || s.productionStatus === "DONE")
  return COORDINATOR_CARD_ACTIONS.flatMap((action): CardActionView[] => {
    const blocker = blockerOf(action)
    if (blocker === null) return [{ action, blocker }]
    if (action === "dispatch-shipping" && readyToShip) return [{ action, blocker }]
    return []
  })
}

/** Lý do khi thẻ không còn nút nào (vd. đơn chưa thu tiền mà tiệm yêu cầu thu trước khi cắm). */
export function noActionReason(blockerOf: (action: CoordinatorAction) => string | null): string {
  return blockerOf("assign-florist") ?? blockerOf("dispatch-shipping") ?? "Chưa có việc cho Điều phối ở bước này"
}
