import { describe, expect, it } from "vitest"
import { filterTracking, inCategory } from "../tracking-filters"

const base = { stepStartedAt: "2026-10-06T08:00:00Z", stuck: null, saleName: "Lan", channel: "Zalo" }

describe("tracking-filters", () => {
  it("nhóm theo bước và nhóm Đang kẹt", () => {
    expect(inCategory({ ...base, currentStepId: "STEP_6_ARRANGING" }, "ARRANGING")).toBe(true)
    expect(inCategory({ ...base, currentStepId: "STEP_6_ARRANGING" }, "DELIVERING")).toBe(false)
    expect(inCategory({ ...base, currentStepId: "STEP_2_CHOOSING", stuck: { stepId: "STEP_2_CHOOSING", owner: "SALE", overdueMinutes: 3, message: "" } }, "STUCK")).toBe(true)
  })

  it("lọc theo sale/kênh; đơn kẹt lâu nhất lên đầu", () => {
    const items = [
      { ...base, id: "a", currentStepId: "STEP_2_CHOOSING" as const, stepStartedAt: "2026-10-06T09:00:00Z" },
      { ...base, id: "b", currentStepId: "STEP_6_ARRANGING" as const, stuck: { stepId: "STEP_6_ARRANGING" as const, owner: "COORDINATOR" as const, overdueMinutes: 40, message: "" } },
      { ...base, id: "c", currentStepId: "STEP_1_OPENED" as const, saleName: "Minh", channel: "Facebook" },
    ]
    expect(filterTracking(items, { category: "ALL", saleName: null, channel: null }).map((i) => i.id)).toEqual(["b", "a", "c"])
    expect(filterTracking(items, { category: "ALL", saleName: "Minh", channel: null }).map((i) => i.id)).toEqual(["c"])
    expect(filterTracking(items, { category: "ALL", saleName: null, channel: "Zalo" }).map((i) => i.id)).toEqual(["b", "a"])
  })
})
