import { describe, expect, it } from "vitest"
import { resolveCoordinatorId } from "../coordinator-owner"

const base = { coordination: null, events: [], qc_records: [], assignments: [] }

describe("Điều phối phụ trách: một quy tắc cho mọi màn", () => {
  it("ưu tiên người được phân công", () => {
    expect(resolveCoordinatorId({ ...base, coordination: { coordinator_id: "u-coord" }, events: [{ axis: "production", actor_id: "u-act" }] })).toBe("u-coord")
  })

  it("rồi người thao tác sản xuất / giao gần nhất (bỏ qua trục khác)", () => {
    expect(resolveCoordinatorId({ ...base, events: [{ axis: "payment", actor_id: "u-pay" }, { axis: "delivery", actor_id: "u-ship" }] })).toBe("u-ship")
  })

  it("rồi người duyệt QC, trước người giao việc cho thợ", () => {
    expect(resolveCoordinatorId({ ...base, qc_records: [{ inspector_id: "u-qc" }], assignments: [{ assigned_by: "u-assign" }] })).toBe("u-qc")
    expect(resolveCoordinatorId({ ...base, assignments: [{ assigned_by: "u-assign" }] })).toBe("u-assign")
  })

  it("chưa ai đụng tới → null", () => {
    expect(resolveCoordinatorId(base)).toBeNull()
  })
})
