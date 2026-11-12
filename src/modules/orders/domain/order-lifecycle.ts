/**
 * Vòng đời đơn trên BỘ BA trục `(status, production_status, delivery_status)` — audit BL-03 (06/11/2026).
 * Sổ đơn (`update-order-progress`), Điều phối (`state-mapper` + `stage-transitions`) và thu tiền cùng ghi ba cột
 * này; mỗi đường từng mang một bản luật riêng nên cùng một đơn đi được những bước mà đường khác cấm. Hàm dưới
 * đây là chỗ duy nhất trả lời "từ bộ ba này sang bộ ba kia có hợp lệ không"; test bảng của Điều phối gọi nó cho
 * mọi bước, nên bảng ánh xạ bước → trục không thể lệch khỏi máy trạng thái M10 mà không đỏ CI.
 */

import {
  validateDeliveryStatusTransition,
  validateOrderStatusTransition,
  validateProductionStatusTransition,
} from "./order-rules"
import type { DeliveryStatus, OrderStatus, ProductionStatus, UpdateOrderInput } from "./order-types"

export interface OrderAxes {
  status: OrderStatus
  productionStatus: ProductionStatus
  deliveryStatus: DeliveryStatus
}

export type LifecycleCheck = { valid: true } | { valid: false; axis: "order" | "production" | "delivery"; reason: string }

export function checkLifecycleTransition(before: OrderAxes, after: OrderAxes): LifecycleCheck {
  const order = validateOrderStatusTransition(before.status, after.status)
  if (!order.valid) return { valid: false, axis: "order", reason: order.reason ?? "Chuyển trạng thái đơn không hợp lệ." }
  const production = validateProductionStatusTransition(before.productionStatus, after.productionStatus)
  if (!production.valid) return { valid: false, axis: "production", reason: production.reason ?? "Chuyển trạng thái chế tác không hợp lệ." }
  const delivery = validateDeliveryStatusTransition(before.deliveryStatus, after.deliveryStatus)
  if (!delivery.valid) return { valid: false, axis: "delivery", reason: delivery.reason ?? "Chuyển trạng thái giao hàng không hợp lệ." }
  return { valid: true }
}

/** Audit User Journey UJ-09 (O4): đơn đã sang Điều phối chỉ đổi tiến độ ở Điều phối (đòi phân công, QC, POD). */
export const COORDINATED_PROGRESS_MESSAGE = "Đơn đang ở Điều phối — cập nhật tiến độ ở màn Điều phối."
/** Audit User Journey UJ-09 (O3): đơn đã hoàn tất / đã huỷ là trạng thái kết thúc. */
export const CLOSED_ORDER_EDIT_MESSAGE = "Đơn đã kết thúc — chỉ sửa được ghi chú nội bộ."

const CLOSED_STATUSES: readonly OrderStatus[] = ["COMPLETED", "CANCELLED"]

/** Yêu cầu sửa có đụng tới một trong ba trục vòng đời không. */
export function touchesLifecycleAxes(input: UpdateOrderInput): boolean {
  return input.status !== undefined || input.productionStatus !== undefined || input.deliveryStatus !== undefined
}

/** Đơn đã kết thúc: mọi trường nghiệp vụ khoá, chỉ còn `internalNote`. `null` = được sửa. */
export function closedOrderEditBlockReason(status: OrderStatus, input: UpdateOrderInput): string | null {
  if (!CLOSED_STATUSES.includes(status)) return null
  const touched = (Object.keys(input) as (keyof UpdateOrderInput)[]).filter((k) => input[k] !== undefined && k !== "internalNote")
  return touched.length > 0 ? CLOSED_ORDER_EDIT_MESSAGE : null
}
