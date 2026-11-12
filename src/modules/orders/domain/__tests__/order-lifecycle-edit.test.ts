import { describe, expect, it } from "vitest"

import { CLOSED_ORDER_EDIT_MESSAGE, closedOrderEditBlockReason, touchesLifecycleAxes } from "../order-lifecycle"

/** Audit User Journey UJ-09: đơn đã kết thúc khoá trường nghiệp vụ (O3); sửa trục vòng đời nhận biết được (O4). */
describe("closedOrderEditBlockReason", () => {
  it("đơn đang chạy → sửa gì cũng được", () => {
    for (const status of ["DRAFT", "CONFIRMED", "PROCESSING", "DELIVERED"] as const) {
      expect(closedOrderEditBlockReason(status, { cardMessage: "Chúc mừng", deliveryStatus: "DISPATCHED" })).toBeNull()
    }
  })

  it("đơn hoàn tất / đã huỷ → chỉ ghi chú nội bộ; trường khác (kể cả xoá về null) bị chặn", () => {
    for (const status of ["COMPLETED", "CANCELLED"] as const) {
      expect(closedOrderEditBlockReason(status, { internalNote: "Khách gọi lại cảm ơn" })).toBeNull()
      expect(closedOrderEditBlockReason(status, {})).toBeNull()
      expect(closedOrderEditBlockReason(status, { cardMessage: null })).toBe(CLOSED_ORDER_EDIT_MESSAGE)
      expect(closedOrderEditBlockReason(status, { internalNote: "x", productionStatus: "READY" })).toBe(CLOSED_ORDER_EDIT_MESSAGE)
    }
  })

  it("thông điệp không chứa mã kỹ thuật", () => {
    expect(CLOSED_ORDER_EDIT_MESSAGE).not.toMatch(/[A-Z_]{4,}|\/api\//)
  })
})

describe("touchesLifecycleAxes", () => {
  it("nhận ra mọi trục, bỏ qua trường thông tin", () => {
    expect(touchesLifecycleAxes({ status: "PROCESSING" })).toBe(true)
    expect(touchesLifecycleAxes({ productionStatus: "ASSIGNED" })).toBe(true)
    expect(touchesLifecycleAxes({ deliveryStatus: "DELIVERED" })).toBe(true)
    expect(touchesLifecycleAxes({ cardMessage: "Chúc mừng", deliveryAddress: null, internalNote: "x" })).toBe(false)
  })
})
