/**
 * State Mapper 2 chiều giữa Coordinator Operational Stage và 3 trục CSDL orders (ALG Core).
 * Bảo đảm backward compatibility 100% — Module M10 cũ không bị ảnh hưởng.
 */

import type { OrderStatus, ProductionStatus, DeliveryStatus } from "@/modules/orders/domain/order-types"
import type { CoordinatorStage, CoordinationRiskLevel } from "./coordinator-types"

export interface MappedOrderAxes {
  status: OrderStatus
  productionStatus: ProductionStatus
  deliveryStatus: DeliveryStatus
}

/**
 * Ánh xạ từ CoordinatorStage sang 3 trục CSDL của bảng orders.
 */
export function mapStageToOrderAxes(stage: CoordinatorStage): MappedOrderAxes {
  switch (stage) {
    case "INTAKE":
      return {
        status: "DRAFT",
        productionStatus: "WAITING",
        deliveryStatus: "PENDING",
      }
    case "VALIDATING":
    case "PLANNING":
      return {
        status: "CONFIRMED",
        productionStatus: "WAITING",
        deliveryStatus: "PENDING",
      }
    case "ASSIGNING":
      return {
        status: "CONFIRMED",
        productionStatus: "ASSIGNED",
        deliveryStatus: "PENDING",
      }
    case "IN_PRODUCTION":
      return {
        status: "PROCESSING",
        productionStatus: "ARRANGING",
        deliveryStatus: "PENDING",
      }
    case "QUALITY_CHECK":
      return {
        status: "PROCESSING",
        productionStatus: "QUALITY_CHECK",
        deliveryStatus: "PENDING",
      }
    case "DISPATCHING":
      return {
        status: "PROCESSING",
        productionStatus: "READY",
        deliveryStatus: "DISPATCHED",
      }
    case "DELIVERED":
      return {
        status: "DELIVERED",
        productionStatus: "READY",
        deliveryStatus: "DELIVERED",
      }
    case "COMPLETED":
      return {
        status: "COMPLETED",
        productionStatus: "READY",
        deliveryStatus: "DELIVERED",
      }
    // EXCEPTION và CANCELLED KHÔNG đi qua đây khi chuyển bước — xem
    // `axesAfterTransition` (giữ nguyên trục sản xuất/giao hàng hiện có).
    case "EXCEPTION":
      return {
        status: "PROCESSING",
        productionStatus: "WAITING",
        deliveryStatus: "PENDING",
      }
    case "CANCELLED":
      return {
        status: "CANCELLED",
        productionStatus: "WAITING",
        deliveryStatus: "PENDING",
      }
    default:
      return {
        status: "CONFIRMED",
        productionStatus: "WAITING",
        deliveryStatus: "PENDING",
      }
  }
}

/**
 * Suy đoán CoordinatorStage khởi tạo từ 3 trục CSDL của đơn hàng cũ.
 */
export function mapOrderAxesToStage(
  status: OrderStatus,
  productionStatus: ProductionStatus,
  deliveryStatus: DeliveryStatus
): CoordinatorStage {
  if (status === "CANCELLED") return "CANCELLED"
  if (status === "COMPLETED") return "COMPLETED"
  if (deliveryStatus === "DELIVERED") return "DELIVERED"
  if (deliveryStatus === "DELIVERING" || deliveryStatus === "DISPATCHED") return "DISPATCHING"
  if (productionStatus === "QUALITY_CHECK") return "QUALITY_CHECK"
  if (productionStatus === "ARRANGING") return "IN_PRODUCTION"
  if (productionStatus === "ASSIGNED") return "ASSIGNING"
  if (status === "CONFIRMED") return "PLANNING"
  if (status === "DRAFT") return "INTAKE"
  return "INTAKE"
}

/**
 * Đánh giá mức độ rủi ro dựa trên chênh lệch thời gian SLA hẹn giao và thời điểm hiện tại.
 */
export function evaluateOrderRiskLevel(params: {
  targetDeliveryAt: Date
  stage: CoordinatorStage
  hasActiveException: boolean
  now?: Date
}): { riskLevel: CoordinationRiskLevel; reason?: string } {
  const { targetDeliveryAt, stage, hasActiveException, now = new Date() } = params

  if (hasActiveException) {
    return {
      riskLevel: "CRITICAL",
      reason: "Đang có sự cố/ngoại lệ chưa được xử lý",
    }
  }

  if (stage === "COMPLETED" || stage === "DELIVERED" || stage === "CANCELLED") {
    return { riskLevel: "NORMAL" }
  }

  const minutesRemaining = Math.floor((targetDeliveryAt.getTime() - now.getTime()) / (60 * 1000))

  if (minutesRemaining < 0) {
    return {
      riskLevel: "CRITICAL",
      reason: `Đã quá hạn giao hẹn ${Math.abs(minutesRemaining)} phút`,
    }
  }

  if (minutesRemaining <= 60 && stage !== "DISPATCHING") {
    return {
      riskLevel: "AT_RISK",
      reason: `Còn dưới 60 phút nhưng hoa chưa bàn giao cho shipper`,
    }
  }

  if (minutesRemaining <= 120 && (stage === "INTAKE" || stage === "VALIDATING" || stage === "PLANNING")) {
    return {
      riskLevel: "ATTENTION",
      reason: `Còn 2 tiếng nhưng chưa phân công thợ chế tác`,
    }
  }

  return { riskLevel: "NORMAL" }
}
