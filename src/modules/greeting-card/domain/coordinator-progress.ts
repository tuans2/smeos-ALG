/**
 * Các bước xưởng của một đơn Thẻ chào, suy từ trạng thái sản xuất/giao hàng —
 * để điều phối thấy ngay bước nào đã xong. Pure TypeScript.
 */

export type ProgressState = "done" | "current" | "pending"

export interface CoordinatorStep {
  key: "assigned" | "ready" | "delivering" | "delivered"
  label: string
  state: ProgressState
}

const LABELS: Record<CoordinatorStep["key"], string> = {
  assigned: "Phân công thợ",
  ready: "Cắm xong",
  delivering: "Đang giao",
  delivered: "Đã giao",
}

export function coordinatorProgress(order: {
  status: string
  productionStatus: string
  deliveryStatus: string
}): CoordinatorStep[] {
  const delivered = order.deliveryStatus === "DELIVERED" || order.status === "COMPLETED"
  const delivering = delivered || order.deliveryStatus === "DELIVERING" || order.deliveryStatus === "DISPATCHED"
  const ready = delivering || order.productionStatus === "READY" || order.productionStatus === "DONE"
  const assigned = ready || ["ASSIGNED", "ARRANGING", "QUALITY_CHECK"].includes(order.productionStatus)
  const done = { assigned, ready, delivering, delivered }
  const keys = Object.keys(LABELS) as CoordinatorStep["key"][]
  const firstOpen = keys.find((k) => !done[k])
  return keys.map((key) => ({
    key,
    label: LABELS[key],
    state: done[key] ? "done" : key === firstOpen ? "current" : "pending",
  }))
}
