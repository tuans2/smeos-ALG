import { describe, expect, it } from "vitest"
import { orderBookActions } from "./order-book-actions"

/** PO 07/11/2026 (Q8), nợ #150: sổ đơn không đổi tiến độ; đơn đã xác nhận theo dõi ở Điều phối. */
describe("orderBookActions", () => {
  it.each([
    ["DRAFT", "PENDING", { canCancel: true, followInCoordinator: false }],
    ["CONFIRMED", "PENDING", { canCancel: true, followInCoordinator: true }],
    ["PROCESSING", "DELIVERING", { canCancel: true, followInCoordinator: true }],
    ["DELIVERED", "DELIVERED", { canCancel: false, followInCoordinator: true }],
    ["COMPLETED", "DELIVERED", { canCancel: false, followInCoordinator: false }],
    ["CANCELLED", "PENDING", { canCancel: false, followInCoordinator: false }],
  ] as const)("%s / %s", (status, deliveryStatus, expected) => {
    expect(orderBookActions({ status, deliveryStatus })).toEqual(expected)
  })
})
