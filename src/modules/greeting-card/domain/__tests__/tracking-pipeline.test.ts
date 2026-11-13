import { describe, it, expect } from "vitest"
import {
  PIPELINE_STEPS,
  getIndustryPipelineSteps,
  type TrackingPipelineStepId,
} from "../tracking-pipeline-types"

describe("Tracking Pipeline Domain", () => {
  it("should define exactly 9 end-to-end pipeline steps", () => {
    expect(PIPELINE_STEPS).toHaveLength(9)
    const expectedStepIds: TrackingPipelineStepId[] = [
      "STEP_1_OPENED",
      "STEP_2_CHOOSING",
      "STEP_3_FILLING_FORM",
      "STEP_4_PAYMENT_PENDING",
      "STEP_5_PAYMENT_CONFIRMED",
      "STEP_6_ARRANGING",
      "STEP_7_READY_QC",
      "STEP_8_DELIVERING",
      "STEP_9_COMPLETED",
    ]
    expect(PIPELINE_STEPS.map((s) => s.id)).toEqual(expectedStepIds)
  })

  it("should have correct sequential order indexes from 1 to 9", () => {
    PIPELINE_STEPS.forEach((step, idx) => {
      expect(step.orderIndex).toBe(idx + 1)
    })
  })

  it("should define human-readable Vietnamese titles for all steps", () => {
    PIPELINE_STEPS.forEach((step) => {
      expect(step.title.length).toBeGreaterThan(0)
      expect(step.shortTitle.length).toBeGreaterThan(0)
      expect(step.roleResponsible.length).toBeGreaterThan(0)
    })
  })

  it("should adapt step titles and roles for HOMESTAY industry", () => {
    const homestaySteps = getIndustryPipelineSteps("HOMESTAY")
    expect(homestaySteps).toHaveLength(9)

    const step6 = homestaySteps.find((s) => s.id === "STEP_6_ARRANGING")
    expect(step6?.shortTitle).toBe("Chuẩn bị phòng")
    expect(step6?.title).toContain("chuẩn bị phòng")
    expect(step6?.roleResponsible).toContain("Quản gia")

    const step7 = homestaySteps.find((s) => s.id === "STEP_7_READY_QC")
    expect(step7?.shortTitle).toBe("Phòng sẵn sàng")

    const step8 = homestaySteps.find((s) => s.id === "STEP_8_DELIVERING")
    expect(step8?.shortTitle).toBe("Nhận phòng")
  })

  it("should adapt step titles for FASHION and FNB industries", () => {
    const fashionSteps = getIndustryPipelineSteps("FASHION")
    expect(fashionSteps.find((s) => s.id === "STEP_6_ARRANGING")?.shortTitle).toBe("May đo")

    const fnbSteps = getIndustryPipelineSteps("FNB")
    expect(fnbSteps.find((s) => s.id === "STEP_6_ARRANGING")?.shortTitle).toBe("Chế biến")
  })
})
