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
import type { DeliveryStatus, OrderStatus, ProductionStatus } from "./order-types"

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
