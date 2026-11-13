import { describe, expect, it } from "vitest"

import { statusAfterDelivery } from "../order-settlement"

describe("statusAfterDelivery (checklist ALG 4.26)", () => {
  it("thu đủ thì hoàn tất, còn nợ thì chờ thu đủ", () => {
    expect(statusAfterDelivery({ totalVnd: 500_000, paidVnd: 500_000 })).toBe("COMPLETED")
    expect(statusAfterDelivery({ totalVnd: 500_000, paidVnd: 150_000 })).toBe("DELIVERED")
    expect(statusAfterDelivery({ totalVnd: 500_000, paidVnd: 0 })).toBe("DELIVERED")
  })
  it("đơn tổng 0 (chưa báo giá hoặc tặng) coi như đã đủ", () => {
    expect(statusAfterDelivery({ totalVnd: 0, paidVnd: 0 })).toBe("COMPLETED")
  })
})
