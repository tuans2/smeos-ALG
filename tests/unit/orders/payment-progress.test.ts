import { describe, expect, it } from "vitest"

import { hasBalanceDue, paymentProgress } from "@/modules/orders/domain/payment-progress"

/** Audit BL-31 (11/11/2026): một luật "đã thanh toán / đặt cọc" cho máy chủ và giao diện, thay ≥ 6 phép so rời. */
describe("tiến độ thanh toán", () => {
  it.each([
    [0, 0, "UNPRICED"],
    [500_000, 0, "UNPAID"],
    [500_000, 200_000, "DEPOSIT"],
    [500_000, 500_000, "PAID"],
    [0, 100_000, "PAID"],
  ] as const)("tổng %i, đã thu %i → %s", (total, paid, expected) => {
    expect(paymentProgress(total, paid)).toBe(expected)
  })

  it("còn phải thu khi có giá mà chưa thu đủ — giống phép so cũ `total > 0 && paid < total`", () => {
    for (const [total, paid] of [[0, 0], [500_000, 0], [500_000, 200_000], [500_000, 500_000], [0, 100_000]] as const) {
      expect(hasBalanceDue(total, paid)).toBe(total > 0 && paid < total)
    }
  })
})
