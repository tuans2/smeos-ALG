import { describe, expect, it } from "vitest"
import { sortWorklist, workBucket } from "../worklist"
import { orderStepStartedAt, sessionStepStartedAt } from "../pipeline-clock"

const stuck = (owner: "SALE" | "COORDINATOR", overdueMinutes: number) => ({ stepId: "STEP_1_OPENED" as const, owner, overdueMinutes, message: "" })

describe("worklist", () => {
  it("phân nhóm theo vai: kẹt đúng phần của mình → Cần tôi làm", () => {
    expect(workBucket({ currentStepId: "STEP_1_OPENED", stepStartedAt: "", stuck: stuck("SALE", 3) }, "SALE")).toBe("ACTION")
    expect(workBucket({ currentStepId: "STEP_1_OPENED", stepStartedAt: "", stuck: stuck("SALE", 3) }, "COORDINATOR")).toBe("WAITING_CUSTOMER")
    expect(workBucket({ currentStepId: "STEP_6_ARRANGING", stepStartedAt: "", stuck: null }, "SALE")).toBe("IN_PROGRESS")
    expect(workBucket({ currentStepId: "STEP_9_COMPLETED", stepStartedAt: "", stuck: stuck("SALE", 3) }, "SALE")).toBe("DONE")
    expect(workBucket({ currentStepId: "STEP_1_OPENED", stepStartedAt: "", stuck: null, isCancelled: true }, "SALE")).toBe("CANCELLED")
  })

  it("việc kẹt quá lâu nhất lên đầu, sau đó đơn vừa đổi bước", () => {
    const items = [
      { id: "a", currentStepId: "STEP_2_CHOOSING" as const, stepStartedAt: "2026-10-06T09:00:00Z", stuck: null },
      { id: "b", currentStepId: "STEP_1_OPENED" as const, stepStartedAt: "2026-10-06T07:00:00Z", stuck: stuck("SALE", 5) },
      { id: "c", currentStepId: "STEP_1_OPENED" as const, stepStartedAt: "2026-10-06T06:00:00Z", stuck: stuck("SALE", 50) },
      { id: "d", currentStepId: "STEP_6_ARRANGING" as const, stepStartedAt: "2026-10-06T10:00:00Z", stuck: stuck("COORDINATOR", 99) },
    ]
    expect(sortWorklist(items, "SALE").map((i) => i.id)).toEqual(["c", "b", "d", "a"])
  })
})

describe("pipeline-clock", () => {
  it("đơn: lần đổi trạng thái gần nhất, bỏ qua ghi chú nội bộ", () => {
    const at = orderStepStartedAt({
      created_at: new Date("2026-10-06T08:00:00Z"),
      events: [{ axis: "status", created_at: new Date("2026-10-06T09:00:00Z") }, { axis: "internal_note", created_at: new Date("2026-10-06T11:00:00Z") }],
      payments: [{ collected_at: new Date("2026-10-06T09:30:00Z") }],
    })
    expect(at).toBe("2026-10-06T09:30:00.000Z")
  })

  it("link: chưa mở tính từ lúc gửi, đang chọn tính từ lúc mở", () => {
    const base = { created_at: new Date("2026-10-06T08:00:00Z"), opened_at: new Date("2026-10-06T08:10:00Z"), updated_at: new Date("2026-10-06T08:30:00Z") }
    expect(sessionStepStartedAt({ ...base, status: "CREATED" })).toBe("2026-10-06T08:00:00.000Z")
    expect(sessionStepStartedAt({ ...base, status: "BROWSING" })).toBe("2026-10-06T08:10:00.000Z")
    expect(sessionStepStartedAt({ ...base, status: "PAYMENT_REPORTED" })).toBe("2026-10-06T08:30:00.000Z")
  })
})
