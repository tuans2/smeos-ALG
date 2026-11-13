import { describe, expect, it } from "vitest"

import { planReconciliation } from "../payment-reconciliation"

describe("planReconciliation", () => {
  const mismatch = { organizationId: "org-1", orderId: "o-1", expectedVnd: 100_000, actualVnd: 50_000 }

  it("đơn lệch được ghi nhận; dòng mở của đơn đã khớp lại được đóng", () => {
    const plan = planReconciliation([mismatch], [{ id: "f-1", entityId: "o-1" }, { id: "f-2", entityId: "o-2" }])
    expect(plan.upsert).toEqual([mismatch])
    expect(plan.resolveIds).toEqual(["f-2"])
  })

  it("không lệch, không dòng mở: không làm gì", () => {
    expect(planReconciliation([], [])).toEqual({ upsert: [], resolveIds: [] })
  })
})
