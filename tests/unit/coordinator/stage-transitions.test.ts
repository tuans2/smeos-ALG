import { describe, expect, it } from "vitest"

import {
  axesAfterTransition,
  changedAxes,
  checkStageTransition,
  isCoordinatorStage,
  type StageTransitionFacts,
} from "@/modules/coordinator/domain/stage-transitions"

const facts = (over: Partial<StageTransitionFacts> = {}): StageTransitionFacts => ({
  partnerAssigned: false,
  latestQcStatus: null,
  podCaptured: false,
  openExceptionCount: 0,
  resumeStage: null,
  balanceVnd: 0,
  ...over,
})

describe("checkStageTransition — luật chuyển bước máy chủ", () => {
  it("cho đi đúng chuỗi thuận", () => {
    expect(checkStageTransition("INTAKE", "PLANNING", facts()).ok).toBe(true)
    expect(checkStageTransition("PLANNING", "ASSIGNING", facts()).ok).toBe(true)
    expect(checkStageTransition("IN_PRODUCTION", "QUALITY_CHECK", facts()).ok).toBe(true)
  })

  it("chặn nhảy cóc INTAKE → COMPLETED", () => {
    const r = checkStageTransition("INTAKE", "COMPLETED", facts())
    expect(r.ok).toBe(false)
  })

  it("ASSIGNING → IN_PRODUCTION đòi đối tác đã phân công", () => {
    expect(checkStageTransition("ASSIGNING", "IN_PRODUCTION", facts()).ok).toBe(false)
    expect(checkStageTransition("ASSIGNING", "IN_PRODUCTION", facts({ partnerAssigned: true })).ok).toBe(true)
  })

  it("QUALITY_CHECK → DISPATCHING đòi lượt QC gần nhất PASSED", () => {
    expect(checkStageTransition("QUALITY_CHECK", "DISPATCHING", facts()).ok).toBe(false)
    expect(checkStageTransition("QUALITY_CHECK", "DISPATCHING", facts({ latestQcStatus: "REWORK_REQUESTED" })).ok).toBe(false)
    expect(checkStageTransition("QUALITY_CHECK", "DISPATCHING", facts({ latestQcStatus: "PASSED" })).ok).toBe(true)
  })

  it("DISPATCHING → DELIVERED đòi POD", () => {
    expect(checkStageTransition("DISPATCHING", "DELIVERED", facts()).ok).toBe(false)
    expect(checkStageTransition("DISPATCHING", "DELIVERED", facts({ podCaptured: true })).ok).toBe(true)
  })

  it("DELIVERED → COMPLETED bị chặn khi còn sự cố mở", () => {
    expect(checkStageTransition("DELIVERED", "COMPLETED", facts({ openExceptionCount: 1 })).ok).toBe(false)
    expect(checkStageTransition("DELIVERED", "COMPLETED", facts()).ok).toBe(true)
  })

  // Audit BL-02 (06/11/2026): luật "chỉ hoàn tất khi đã thu đủ" từng chỉ có ở `/close`, `/stage` bỏ qua.
  it("DELIVERED → COMPLETED bị chặn khi còn phải thu, cùng lý do với checkClosure", () => {
    const r = checkStageTransition("DELIVERED", "COMPLETED", facts({ balanceVnd: 1 }))
    expect(r).toEqual({ ok: false, reason: expect.stringContaining("chỉ hoàn tất khi đã thu đủ") })
    expect(checkStageTransition("DELIVERED", "COMPLETED", facts({ balanceVnd: 0 })).ok).toBe(true)
  })

  it("thoát EXCEPTION chỉ về đúng resume_stage và khi hết sự cố", () => {
    expect(checkStageTransition("EXCEPTION", "IN_PRODUCTION", facts({ resumeStage: "IN_PRODUCTION", openExceptionCount: 1 })).ok).toBe(false)
    expect(checkStageTransition("EXCEPTION", "DISPATCHING", facts({ resumeStage: "IN_PRODUCTION" })).ok).toBe(false)
    expect(checkStageTransition("EXCEPTION", "IN_PRODUCTION", facts({ resumeStage: "IN_PRODUCTION" })).ok).toBe(true)
  })

  it("không cho mở sự cố/huỷ qua đường chuyển bước chung, không đi tiếp từ bước kết thúc", () => {
    expect(checkStageTransition("PLANNING", "EXCEPTION", facts()).ok).toBe(false)
    expect(checkStageTransition("PLANNING", "CANCELLED", facts()).ok).toBe(false)
    expect(checkStageTransition("COMPLETED", "DELIVERED", facts()).ok).toBe(false)
    expect(checkStageTransition("CANCELLED", "PLANNING", facts()).ok).toBe(false)
  })

  it("isCoordinatorStage từ chối chuỗi lạ", () => {
    expect(isCoordinatorStage("DISPATCHING")).toBe(true)
    expect(isCoordinatorStage("HACKED")).toBe(false)
  })
})

describe("axesAfterTransition — ba trục orders", () => {
  const dispatching = { status: "PROCESSING", productionStatus: "READY", deliveryStatus: "DISPATCHED" } as const

  it("EXCEPTION giữ nguyên ba trục (không kéo delivery về PENDING)", () => {
    expect(axesAfterTransition("EXCEPTION", dispatching)).toEqual(dispatching)
  })

  it("CANCELLED chỉ đổi trục đơn", () => {
    expect(axesAfterTransition("CANCELLED", dispatching)).toEqual({ ...dispatching, status: "CANCELLED" })
  })

  it("changedAxes chỉ liệt kê trục thay đổi", () => {
    const after = axesAfterTransition("DELIVERED", dispatching)
    expect(changedAxes(dispatching, after)).toEqual([
      { axis: "order", from: "PROCESSING", to: "DELIVERED" },
      { axis: "delivery", from: "DISPATCHED", to: "DELIVERED" },
    ])
  })
})
