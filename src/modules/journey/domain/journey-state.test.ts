import { describe, expect, it } from "vitest"
import {
  advanceStep,
  createJourneyState,
  failStep,
  getCurrentStep,
  isJourneyComplete,
  retryStep,
  setStepInput,
  skipStep,
  startStepProcessing,
} from "./journey-state"
import type { JourneyDefinition } from "./journey-model"

const mockJourney: JourneyDefinition = {
  id: "mock-journey",
  goal: "Hành trình giả lập",
  description: "Dùng để kiểm thử state machine",
  icon: "Play",
  roleScope: "STORE",
  category: "COMBO",
  steps: [
    {
      id: "step-1",
      label: "Bước nhập liệu",
      inputType: "IMAGE_UPLOAD",
      isOptional: false,
      nextStepId: "step-2",
    },
    {
      id: "step-2",
      label: "Bước tùy chọn",
      inputType: "CONFIG_SELECT",
      isOptional: true,
      nextStepId: "step-3",
    },
    {
      id: "step-3",
      label: "Bước xác nhận cuối",
      inputType: "CONFIRMATION",
      isOptional: false,
      nextStepId: null,
    },
  ],
}

describe("journey-state machine domain", () => {
  it("khởi tạo trạng thái ban đầu chính xác", () => {
    const state = createJourneyState(mockJourney)
    expect(state.definitionId).toBe("mock-journey")
    expect(state.currentStepIndex).toBe(0)
    expect(state.steps).toHaveLength(3)
    expect(state.steps[0]?.status).toBe("INPUT_REQUIRED")
    expect(state.steps[1]?.status).toBe("LOCKED")
    expect(state.steps[2]?.status).toBe("LOCKED")
    expect(state.completedAt).toBeNull()
  })

  it("cập nhật input và chuyển sang READY", () => {
    let state = createJourneyState(mockJourney)
    state = setStepInput(state, "step-1", { fileUrl: "test.jpg" })
    expect(state.steps[0]?.status).toBe("READY")
    expect(state.steps[0]?.input).toEqual({ fileUrl: "test.jpg" })
  })

  it("chuyển sang PROCESSING khi bắt đầu xử lý", () => {
    let state = createJourneyState(mockJourney)
    state = startStepProcessing(state, "step-1")
    expect(state.steps[0]?.status).toBe("PROCESSING")
  })

  it("tiến bước (advanceStep) hoàn thành bước hiện tại và mở khóa bước kế", () => {
    let state = createJourneyState(mockJourney)
    state = advanceStep(state, "step-1", { result: "done-1" })
    expect(state.steps[0]?.status).toBe("COMPLETED")
    expect(state.steps[0]?.output).toEqual({ result: "done-1" })
    expect(state.steps[1]?.status).toBe("INPUT_REQUIRED")
    expect(state.currentStepIndex).toBe(1)
  })

  it("bỏ qua bước tùy chọn (skipStep) thành công", () => {
    let state = createJourneyState(mockJourney)
    state = advanceStep(state, "step-1")
    // Bước 2 là tùy chọn
    state = skipStep(state, "step-2", mockJourney)
    expect(state.steps[1]?.status).toBe("COMPLETED")
    expect(state.steps[1]?.output).toEqual({ skipped: true })
    expect(state.steps[2]?.status).toBe("INPUT_REQUIRED")
  })

  it("không cho phép bỏ qua bước bắt buộc", () => {
    let state = createJourneyState(mockJourney)
    // Bước 1 là bắt buộc
    const newState = skipStep(state, "step-1", mockJourney)
    expect(newState).toBe(state) // Giữ nguyên không đổi
  })

  it("xử lý lỗi (failStep) và thử lại (retryStep)", () => {
    let state = createJourneyState(mockJourney)
    state = failStep(state, "step-1", "Lỗi mạng kết nối")
    expect(state.steps[0]?.status).toBe("FAILED")
    expect(state.steps[0]?.error).toBe("Lỗi mạng kết nối")

    state = retryStep(state, "step-1")
    expect(state.steps[0]?.status).toBe("RETRY")
    expect(state.steps[0]?.error).toBeNull()
  })

  it("hoàn thành toàn bộ hành trình ghi nhận completedAt", () => {
    let state = createJourneyState(mockJourney)
    state = advanceStep(state, "step-1")
    state = advanceStep(state, "step-2")
    state = advanceStep(state, "step-3", { final: true })

    expect(isJourneyComplete(state)).toBe(true)
    expect(state.completedAt).not.toBeNull()
  })

  it("lấy thông tin bước hiện tại (getCurrentStep)", () => {
    const state = createJourneyState(mockJourney)
    const current = getCurrentStep(state, mockJourney)
    expect(current).not.toBeNull()
    expect(current?.definition.id).toBe("step-1")
    expect(current?.state.status).toBe("INPUT_REQUIRED")
  })
})
