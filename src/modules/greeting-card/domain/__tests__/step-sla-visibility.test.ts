import { describe, expect, it } from "vitest"
import { formatMinutes, parseStepSla, stuckOf } from "../step-sla"
import { ownSaleScope, parseVisibility } from "../order-visibility"


describe("step-sla", () => {
  it("cài đặt hỏng/thiếu → mặc định; tắt từng bước được", () => {
    const sla = parseStepSla({ brochure_step_sla: { STEP_1_OPENED: { minutes: 10 }, STEP_2_CHOOSING: { enabled: false, minutes: -3 } } })
    expect(sla.STEP_1_OPENED).toEqual({ enabled: true, minutes: 10 })
    expect(sla.STEP_2_CHOOSING).toEqual({ enabled: false, minutes: 30 })
    expect(sla.STEP_6_ARRANGING.minutes).toBe(120)
  })

  it("link gửi quá 5 phút chưa mở → kẹt, giao cho Sale", () => {
    const item = { currentStepId: "STEP_1_OPENED" as const, stepStartedAt: "2026-10-06T08:00:00Z" }
    const sla = parseStepSla({})
    expect(stuckOf(item, sla, new Date("2026-10-06T08:04:00Z"))).toBeNull()
    expect(stuckOf(item, sla, new Date("2026-10-06T08:12:00Z"))).toMatchObject({ owner: "SALE", overdueMinutes: 7 })
  })

  it("bước tắt không báo; bước Hoàn tất không có thời gian chuẩn", () => {
    const item = { currentStepId: "STEP_2_CHOOSING" as const, stepStartedAt: "2026-10-06T08:00:00Z" }
    expect(stuckOf(item, parseStepSla({}), new Date("2026-10-06T08:45:00Z"))?.overdueMinutes).toBe(15)
    expect(stuckOf(item, parseStepSla({ brochure_step_sla: { STEP_2_CHOOSING: { enabled: false } } }), new Date("2026-10-06T09:45:00Z"))).toBeNull()
    expect(stuckOf({ currentStepId: "STEP_9_COMPLETED", stepStartedAt: "2026-01-01T00:00:00Z" }, parseStepSla({}))).toBeNull()
  })

  it("định dạng thời gian dễ đọc", () => {
    expect(formatMinutes(45)).toBe("45 phút")
    expect(formatMinutes(125)).toBe("2 giờ 5 phút")
    expect(formatMinutes(1500)).toBe("1 ngày 1 giờ")
  })
})

describe("order-visibility theo từng sale", () => {
  const sale = (userId: string) => ({ userId, capabilities: new Set(["R1", "R2"]) })

  it("chọn riêng từng sale đè mặc định; điều hành luôn thấy tất cả", () => {
    const vis = parseVisibility({ brochure_visibility: { mode: "ALL", members: { lan: "OWN", rac: "XYZ" } } })
    expect(ownSaleScope(vis, sale("lan"))).toBe("lan")
    expect(ownSaleScope(vis, sale("minh"))).toBeNull()
    expect(ownSaleScope({ ...vis, mode: "OWN" }, sale("minh"))).toBe("minh")
    expect(ownSaleScope(vis, { userId: "lan", capabilities: new Set(["R4"]) })).toBeNull()
    expect(ownSaleScope(vis, { userId: "lan", capabilities: new Set(["R2", "R9"]) })).toBe("lan")
    expect(vis.members).toEqual({ lan: "OWN" })
  })
})
