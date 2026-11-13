import { describe, expect, it } from "vitest"
import { groupSaleKanban } from "@/modules/greeting-card/domain/sale-kanban"
import { PIPELINE_STEPS, type TrackingPipelineStepId } from "@/modules/greeting-card/domain/tracking-pipeline-types"
import type { StepOwner } from "@/modules/greeting-card/domain/step-sla"

const item = (id: string, step: TrackingPipelineStepId, startedAt: string, stuckOwner?: StepOwner, overdue = 10) => ({
  id,
  currentStepId: step,
  stepStartedAt: startedAt,
  stuck: stuckOwner ? { stepId: step, owner: stuckOwner, overdueMinutes: overdue, message: "quá hạn" } : null,
})

describe("groupSaleKanban", () => {
  it("tách đủ 9 cột theo đúng thứ tự bước 1 → 9, kể cả cột trống", () => {
    const cols = groupSaleKanban([])
    expect(cols.map((c) => c.step.id)).toEqual(PIPELINE_STEPS.map((s) => s.id))
    expect(cols).toHaveLength(9)
    expect(cols.every((c) => c.items.length === 0 && c.needsMe === 0)).toBe(true)
  })

  it("mỗi thẻ nằm đúng cột của bước hiện tại, không gộp bước", () => {
    const cols = groupSaleKanban([
      item("a", "STEP_2_CHOOSING", "2026-10-08T01:00:00Z"),
      item("b", "STEP_3_FILLING_FORM", "2026-10-08T01:00:00Z"),
      item("c", "STEP_9_COMPLETED", "2026-10-08T01:00:00Z"),
    ])
    const byStep = Object.fromEntries(cols.map((c) => [c.step.id, c.items.map((i) => i.id)]))
    expect(byStep.STEP_2_CHOOSING).toEqual(["a"])
    expect(byStep.STEP_3_FILLING_FORM).toEqual(["b"])
    expect(byStep.STEP_9_COMPLETED).toEqual(["c"])
    expect(byStep.STEP_1_OPENED).toEqual([])
  })

  it("trong cột: việc kẹt của Sale lên đầu, rồi đơn vừa đổi bước; đếm số thẻ cần Sale", () => {
    const cols = groupSaleKanban([
      item("old", "STEP_4_PAYMENT_PENDING", "2026-10-08T01:00:00Z"),
      item("new", "STEP_4_PAYMENT_PENDING", "2026-10-08T05:00:00Z"),
      item("admin-stuck", "STEP_4_PAYMENT_PENDING", "2026-10-08T00:00:00Z", "ADMIN", 500),
      item("sale-stuck", "STEP_4_PAYMENT_PENDING", "2026-10-07T00:00:00Z", "SALE"),
    ])
    const col = cols.find((c) => c.step.id === "STEP_4_PAYMENT_PENDING")!
    expect(col.items.map((i) => i.id)).toEqual(["sale-stuck", "new", "old", "admin-stuck"])
    expect(col.needsMe).toBe(1)
  })
})
