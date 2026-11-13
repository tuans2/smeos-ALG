import { describe, it, expect } from "vitest"
import {
  validateOrderStatusTransition,
  validateProductionStatusTransition,
  validateDeliveryStatusTransition,
  calculateOrderTotal,
  calculateOrderSla,
  generateOrderCode,
  calculateOrderTotalWithAdjustments,
} from "@/modules/orders/domain/order-rules"
import type { OrderEventRecord } from "@/modules/orders/domain/order-types"

describe("M10 Order Domain Rules", () => {
  describe("validateOrderStatusTransition", () => {
    it("cho phép chuyển từ DRAFT sang CONFIRMED hoặc CANCELLED", () => {
      expect(validateOrderStatusTransition("DRAFT", "CONFIRMED").valid).toBe(true)
      expect(validateOrderStatusTransition("DRAFT", "CANCELLED").valid).toBe(true)
      expect(validateOrderStatusTransition("DRAFT", "COMPLETED").valid).toBe(false)
    })

    it("cho phép chuyển từ CONFIRMED sang PROCESSING hoặc CANCELLED", () => {
      expect(validateOrderStatusTransition("CONFIRMED", "PROCESSING").valid).toBe(true)
      expect(validateOrderStatusTransition("CONFIRMED", "CANCELLED").valid).toBe(true)
      expect(validateOrderStatusTransition("CONFIRMED", "DRAFT").valid).toBe(false)
    })

    it("chặn chuyển trạng thái khi đã COMPLETED hoặc CANCELLED", () => {
      expect(validateOrderStatusTransition("COMPLETED", "PROCESSING").valid).toBe(false)
      expect(validateOrderStatusTransition("CANCELLED", "CONFIRMED").valid).toBe(false)
    })
  })

  describe("validateProductionStatusTransition", () => {
    it("cho phép luồng sản xuất chuẩn: WAITING -> ASSIGNED -> ARRANGING -> QUALITY_CHECK -> READY", () => {
      expect(validateProductionStatusTransition("WAITING", "ASSIGNED").valid).toBe(true)
      expect(validateProductionStatusTransition("ASSIGNED", "ARRANGING").valid).toBe(true)
      expect(validateProductionStatusTransition("ARRANGING", "QUALITY_CHECK").valid).toBe(true)
      expect(validateProductionStatusTransition("QUALITY_CHECK", "READY").valid).toBe(true)
    })

    it("chặn nhảy cóc từ WAITING thẳng sang READY", () => {
      expect(validateProductionStatusTransition("WAITING", "READY").valid).toBe(false)
    })
  })

  describe("validateDeliveryStatusTransition", () => {
    it("cho phép PENDING -> DISPATCHED -> DELIVERING -> DELIVERED", () => {
      expect(validateDeliveryStatusTransition("PENDING", "DISPATCHED").valid).toBe(true)
      expect(validateDeliveryStatusTransition("DISPATCHED", "DELIVERING").valid).toBe(true)
      expect(validateDeliveryStatusTransition("DELIVERING", "DELIVERED").valid).toBe(true)
    })

    it("cho phép báo FAILED khi đang giao và quay lại DELIVERING", () => {
      expect(validateDeliveryStatusTransition("DELIVERING", "FAILED").valid).toBe(true)
      expect(validateDeliveryStatusTransition("FAILED", "DELIVERING").valid).toBe(true)
    })
  })

  describe("calculateOrderTotal", () => {
    it("tính chính xác tổng tiền từ các dòng order items", () => {
      const items = [
        { description: "Bó hoa hồng 20 cành", quantity: 2, unitPriceVnd: 500000 },
        { description: "Thiệp chúc mừng", quantity: 1, unitPriceVnd: 50000 },
      ]
      expect(calculateOrderTotal(items)).toBe(1050000)
    })

    it("trả về 0 nếu danh sách rỗng", () => {
      expect(calculateOrderTotal([])).toBe(0)
    })
  })

  describe("calculateOrderSla", () => {
    it("tính chuẩn thời gian xử lý dựa trên chuỗi order_events", () => {
      const baseTime = new Date("2026-09-16T08:00:00Z")
      const events: OrderEventRecord[] = [
        {
          id: "ev1",
          organizationId: "org-1",
          orderId: "ord-1",
          axis: "order",
          toValue: "DRAFT",
          createdAt: baseTime,
        },
        {
          id: "ev2",
          organizationId: "org-1",
          orderId: "ord-1",
          axis: "production",
          toValue: "ARRANGING",
          createdAt: new Date("2026-09-16T08:30:00Z"),
        },
        {
          id: "ev3",
          organizationId: "org-1",
          orderId: "ord-1",
          axis: "production",
          toValue: "READY",
          createdAt: new Date("2026-09-16T09:15:00Z"),
        },
        {
          id: "ev4",
          organizationId: "org-1",
          orderId: "ord-1",
          axis: "order",
          toValue: "COMPLETED",
          createdAt: new Date("2026-09-16T10:00:00Z"),
        },
      ]

      const sla = calculateOrderSla(events, 180)
      expect(sla.totalDurationMinutes).toBe(120) // 8h -> 10h = 120 phút
      expect(sla.productionDurationMinutes).toBe(45) // 8h30 -> 9h15 = 45 phút
      expect(sla.isSlaMet).toBe(true) // 120 <= 180
    })
  })

  describe("generateOrderCode", () => {
    it("sinh mã đơn định dạng DH + YYMMDD + -XXXX", () => {
      const fixedDate = new Date("2026-09-16T00:00:00Z")
      const code = generateOrderCode(15, fixedDate)
      expect(code).toBe("DH260916-0015")
    })
  })
})

describe("calculateOrderTotalWithAdjustments — ưu đãi/phí giao cấp đơn (UJ-08)", () => {
  const items = [{ quantity: 2, unitPriceVnd: 500_000 }]

  it("tiền hàng − ưu đãi + phí giao", () => {
    expect(calculateOrderTotalWithAdjustments(items, { discountVnd: 100_000, shippingFeeVnd: 30_000 })).toBe(930_000)
  })

  it("không có điều chỉnh → bằng tổng dòng hàng", () => {
    expect(calculateOrderTotalWithAdjustments(items, undefined)).toBe(calculateOrderTotal(items))
  })

  it("ưu đãi không vượt tiền hàng, giá trị âm bị bỏ", () => {
    expect(calculateOrderTotalWithAdjustments(items, { discountVnd: 5_000_000, shippingFeeVnd: 20_000 })).toBe(20_000)
    expect(calculateOrderTotalWithAdjustments(items, { discountVnd: -1, shippingFeeVnd: -1 })).toBe(1_000_000)
  })
})
