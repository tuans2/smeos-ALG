import { describe, expect, it } from "vitest"
import { validateJourneyDefinition } from "./journey-model"
import type { JourneyDefinition } from "./journey-model"

describe("journey-model domain", () => {
  it("xác thực hợp lệ khi journey có đầy đủ thông tin chuẩn", () => {
    const validJourney: JourneyDefinition = {
      id: "test-journey",
      goal: "Mục tiêu thử nghiệm",
      description: "Mô tả thử nghiệm",
      icon: "Sparkles",
      roleScope: "STORE",
      category: "SINGLE",
      steps: [
        {
          id: "step-1",
          label: "Bước 1",
          inputType: "IMAGE_UPLOAD",
          isOptional: false,
          nextStepId: "step-2",
        },
        {
          id: "step-2",
          label: "Bước 2",
          inputType: "CONFIRMATION",
          isOptional: false,
          nextStepId: null,
        },
      ],
    }

    const result = validateJourneyDefinition(validJourney)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("phát hiện lỗi khi thiếu các trường bắt buộc", () => {
    const invalidJourney: JourneyDefinition = {
      id: "",
      goal: "",
      description: "",
      icon: "",
      roleScope: "" as never,
      category: "SINGLE",
      steps: [],
    }

    const result = validateJourneyDefinition(invalidJourney)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it("phát hiện lỗi trùng lặp mã bước (step id)", () => {
    const duplicateStepJourney: JourneyDefinition = {
      id: "dup-steps",
      goal: "Trùng lặp bước",
      description: "Thử nghiệm trùng lặp",
      icon: "AlertTriangle",
      roleScope: "STORE",
      category: "SINGLE",
      steps: [
        {
          id: "step-1",
          label: "Bước 1",
          inputType: "NONE",
          isOptional: false,
          nextStepId: null,
        },
        {
          id: "step-1",
          label: "Bước 1 trùng",
          inputType: "NONE",
          isOptional: false,
          nextStepId: null,
        },
      ],
    }

    const result = validateJourneyDefinition(duplicateStepJourney)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes("Trùng lặp mã bước"))).toBe(true)
  })
})
