import { describe, expect, it } from "vitest"

import { workbenchStage } from "../list-workbench"

describe("bàn làm việc — giai đoạn đơn ngoài Thẻ chào", () => {
  it("phân đúng: chờ báo giá → chờ thu → chờ duyệt → điều phối → đã giao còn nợ", () => {
    const base = { totalVnd: 500_000, inCoordination: false, deliveryStatus: "PENDING", requestStatus: null }
    expect(workbenchStage({ ...base, totalVnd: 0 })).toBe("NEEDS_QUOTE")
    expect(workbenchStage(base)).toBe("AWAITING_PAYMENT")
    expect(workbenchStage({ ...base, requestStatus: "PENDING" })).toBe("AWAITING_APPROVAL")
    expect(workbenchStage({ ...base, inCoordination: true })).toBe("IN_COORDINATION")
    expect(workbenchStage({ ...base, inCoordination: true, deliveryStatus: "DELIVERED" })).toBe("DELIVERED_UNPAID")
  })
})
