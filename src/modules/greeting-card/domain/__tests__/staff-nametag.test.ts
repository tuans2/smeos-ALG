import { describe, it, expect } from "vitest"
import { formatStaffCode, isCoordinationStage } from "@/components/greeting-card/staff-nametag"

describe("Staff Nametag Logic & Formatting", () => {
  describe("formatStaffCode", () => {
    it("formats standard user id into NV-XXXXXX", () => {
      expect(formatStaffCode("usr-abc123def456")).toBe("NV-USRABC")
      expect(formatStaffCode("f81d4fae-7dec-11d0-a765-00a0c91e6bf6")).toBe("NV-F81D4F")
    })

    it("handles short or clean ids correctly", () => {
      expect(formatStaffCode("user1")).toBe("NV-USER1")
      expect(formatStaffCode("public")).toBe("CHUNG")
      expect(formatStaffCode(null)).toBe("—")
      expect(formatStaffCode(undefined)).toBe("—")
    })
  })

  describe("isCoordinationStage", () => {
    it("returns false for session items", () => {
      expect(isCoordinationStage({ type: "SESSION", currentStepId: "STEP_1_OPENED" })).toBe(false)
      expect(isCoordinationStage({ type: "SESSION", currentStepId: "STEP_2_CHOOSING" })).toBe(false)
      expect(isCoordinationStage({ type: "SESSION", currentStepId: "STEP_3_FILLING_FORM" })).toBe(false)
    })

    it("returns false for sales stage order steps (steps 1–5)", () => {
      expect(isCoordinationStage({ type: "ORDER", currentStepId: "STEP_1_OPENED" })).toBe(false)
      expect(isCoordinationStage({ type: "ORDER", currentStepId: "STEP_2_CHOOSING" })).toBe(false)
      expect(isCoordinationStage({ type: "ORDER", currentStepId: "STEP_3_FILLING_FORM" })).toBe(false)
      expect(isCoordinationStage({ type: "ORDER", currentStepId: "STEP_4_PAYMENT_PENDING" })).toBe(false)
      expect(isCoordinationStage({ type: "ORDER", currentStepId: "STEP_5_PAYMENT_CONFIRMED" })).toBe(false)
    })

    it("returns true for coordination steps (steps 6–9)", () => {
      expect(isCoordinationStage({ type: "ORDER", currentStepId: "STEP_6_ARRANGING" })).toBe(true)
      expect(isCoordinationStage({ type: "ORDER", currentStepId: "STEP_7_READY_QC" })).toBe(true)
      expect(isCoordinationStage({ type: "ORDER", currentStepId: "STEP_8_DELIVERING" })).toBe(true)
      expect(isCoordinationStage({ type: "ORDER", currentStepId: "STEP_9_COMPLETED" })).toBe(true)
    })

    it("returns true when production status is active in workshop", () => {
      expect(isCoordinationStage({ productionStatus: "ASSIGNED" })).toBe(true)
      expect(isCoordinationStage({ productionStatus: "ARRANGING" })).toBe(true)
      expect(isCoordinationStage({ productionStatus: "QUALITY_CHECK" })).toBe(true)
      expect(isCoordinationStage({ productionStatus: "READY" })).toBe(true)
      expect(isCoordinationStage({ productionStatus: "DONE" })).toBe(true)
    })

    it("returns true when delivery status is active in logistics", () => {
      expect(isCoordinationStage({ deliveryStatus: "DISPATCHED" })).toBe(true)
      expect(isCoordinationStage({ deliveryStatus: "DELIVERING" })).toBe(true)
      expect(isCoordinationStage({ deliveryStatus: "DELIVERED" })).toBe(true)
      expect(isCoordinationStage({ deliveryStatus: "FAILED" })).toBe(true)
    })

    it("returns false for empty or null target", () => {
      expect(isCoordinationStage(null)).toBe(false)
      expect(isCoordinationStage(undefined)).toBe(false)
      expect(isCoordinationStage({})).toBe(false)
    })
  })
})
