import { describe, it, expect } from "vitest"
import {
  mapStageToOrderAxes,
  mapOrderAxesToStage,
  evaluateOrderRiskLevel,
} from "@/modules/coordinator/domain/state-mapper"
import type { CoordinatorStage } from "@/modules/coordinator/domain/coordinator-types"

describe("Coordinator State Mapper", () => {
  it("ánh xạ chính xác từ CoordinatorStage sang 3 trục CSDL orders", () => {
    // Stage INTAKE -> DRAFT, WAITING, PENDING
    expect(mapStageToOrderAxes("INTAKE")).toEqual({
      status: "DRAFT",
      productionStatus: "WAITING",
      deliveryStatus: "PENDING",
    })

    // Stage IN_PRODUCTION -> PROCESSING, ARRANGING, PENDING
    expect(mapStageToOrderAxes("IN_PRODUCTION")).toEqual({
      status: "PROCESSING",
      productionStatus: "ARRANGING",
      deliveryStatus: "PENDING",
    })

    // Stage QUALITY_CHECK -> PROCESSING, QUALITY_CHECK, PENDING
    expect(mapStageToOrderAxes("QUALITY_CHECK")).toEqual({
      status: "PROCESSING",
      productionStatus: "QUALITY_CHECK",
      deliveryStatus: "PENDING",
    })

    // Stage DISPATCHING -> PROCESSING, READY, DISPATCHED
    expect(mapStageToOrderAxes("DISPATCHING")).toEqual({
      status: "PROCESSING",
      productionStatus: "READY",
      deliveryStatus: "DISPATCHED",
    })

    // Stage DELIVERED -> DELIVERED, READY, DELIVERED
    expect(mapStageToOrderAxes("DELIVERED")).toEqual({
      status: "DELIVERED",
      productionStatus: "READY",
      deliveryStatus: "DELIVERED",
    })

    // Stage COMPLETED -> COMPLETED, READY, DELIVERED
    expect(mapStageToOrderAxes("COMPLETED")).toEqual({
      status: "COMPLETED",
      productionStatus: "READY",
      deliveryStatus: "DELIVERED",
    })
  })

  it("suy đoán ngược CoordinatorStage từ 3 trục CSDL orders", () => {
    expect(mapOrderAxesToStage("COMPLETED", "READY", "DELIVERED")).toBe("COMPLETED")
    expect(mapOrderAxesToStage("DELIVERED", "READY", "DELIVERED")).toBe("DELIVERED")
    expect(mapOrderAxesToStage("PROCESSING", "READY", "DISPATCHED")).toBe("DISPATCHING")
    expect(mapOrderAxesToStage("PROCESSING", "QUALITY_CHECK", "PENDING")).toBe("QUALITY_CHECK")
    expect(mapOrderAxesToStage("PROCESSING", "ARRANGING", "PENDING")).toBe("IN_PRODUCTION")
    expect(mapOrderAxesToStage("CONFIRMED", "ASSIGNED", "PENDING")).toBe("ASSIGNING")
    expect(mapOrderAxesToStage("CONFIRMED", "WAITING", "PENDING")).toBe("PLANNING")
    expect(mapOrderAxesToStage("DRAFT", "WAITING", "PENDING")).toBe("INTAKE")
  })

  it("đánh giá mức độ rủi ro SLA chính xác", () => {
    const now = new Date("2026-09-25T14:00:00Z")

    // Quá hạn giao -> CRITICAL
    const pastDelivery = new Date("2026-09-25T13:30:00Z")
    expect(
      evaluateOrderRiskLevel({
        targetDeliveryAt: pastDelivery,
        stage: "IN_PRODUCTION",
        hasActiveException: false,
        now,
      }).riskLevel
    ).toBe("CRITICAL")

    // Có sự cố chưa xử lý -> CRITICAL
    const futureDelivery = new Date("2026-09-25T17:00:00Z")
    expect(
      evaluateOrderRiskLevel({
        targetDeliveryAt: futureDelivery,
        stage: "IN_PRODUCTION",
        hasActiveException: true,
        now,
      }).riskLevel
    ).toBe("CRITICAL")

    // Còn dưới 60 phút nhưng chưa giao -> AT_RISK
    const tightDelivery = new Date("2026-09-25T14:45:00Z")
    expect(
      evaluateOrderRiskLevel({
        targetDeliveryAt: tightDelivery,
        stage: "QUALITY_CHECK",
        hasActiveException: false,
        now,
      }).riskLevel
    ).toBe("AT_RISK")

    // Đã hoàn tất -> NORMAL
    expect(
      evaluateOrderRiskLevel({
        targetDeliveryAt: pastDelivery,
        stage: "COMPLETED",
        hasActiveException: false,
        now,
      }).riskLevel
    ).toBe("NORMAL")
  })
})
