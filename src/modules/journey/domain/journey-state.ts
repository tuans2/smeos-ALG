/**
 * Máy trạng thái Journey (State Machine) thuần túy.
 * Nguồn đặc tả: ALG_CORE_JOURNEY_FIRST_UX_ARCHITECTURE_FINAL.md (§18)
 *
 * Luật Clean Architecture: Không import React, không import Prisma, không side-effects.
 */

import type {
  JourneyDefinition,
  JourneyStepDefinition,
  JourneyStepStatus,
} from "./journey-model"

export interface JourneyStepState {
  stepId: string
  status: JourneyStepStatus
  input: unknown | null
  output: unknown | null
  error: string | null
}

export interface JourneyState {
  definitionId: string
  currentStepIndex: number
  steps: JourneyStepState[]
  startedAt: string
  completedAt: string | null
}

/**
 * Khởi tạo trạng thái mới từ một JourneyDefinition
 */
export function createJourneyState(definition: JourneyDefinition): JourneyState {
  const steps: JourneyStepState[] = definition.steps.map((step, idx) => ({
    stepId: step.id,
    // Bước đầu tiên ở trạng thái READY/INPUT_REQUIRED, các bước sau LOCKED
    status: idx === 0 ? (step.inputType === "NONE" ? "READY" : "INPUT_REQUIRED") : "LOCKED",
    input: null,
    output: null,
    error: null,
  }))

  return {
    definitionId: definition.id,
    currentStepIndex: 0,
    steps,
    startedAt: new Date().toISOString(),
    completedAt: null,
  }
}

/**
 * Cập nhật input cho bước hiện tại
 */
export function setStepInput(
  state: JourneyState,
  stepId: string,
  input: unknown
): JourneyState {
  return {
    ...state,
    steps: state.steps.map((s) =>
      s.stepId === stepId
        ? { ...s, input, status: "READY" as JourneyStepStatus, error: null }
        : s
    ),
  }
}

/**
 * Đánh dấu bước đang xử lý
 */
export function startStepProcessing(
  state: JourneyState,
  stepId: string
): JourneyState {
  return {
    ...state,
    steps: state.steps.map((s) =>
      s.stepId === stepId ? { ...s, status: "PROCESSING" as JourneyStepStatus } : s
    ),
  }
}

/**
 * Hoàn thành bước hiện tại và mở khóa bước kế tiếp
 */
export function advanceStep(
  state: JourneyState,
  stepId: string,
  output?: unknown
): JourneyState {
  const stepIdx = state.steps.findIndex((s) => s.stepId === stepId)
  if (stepIdx === -1) return state

  const updatedSteps = state.steps.map((s, idx) => {
    if (idx === stepIdx) {
      return {
        ...s,
        status: "COMPLETED" as JourneyStepStatus,
        output: output ?? s.output,
        error: null,
      }
    }
    // Mở khóa bước kế tiếp nếu nó đang LOCKED
    if (idx === stepIdx + 1 && s.status === "LOCKED") {
      return {
        ...s,
        status: "INPUT_REQUIRED" as JourneyStepStatus,
      }
    }
    return s
  })

  const nextStepIndex = Math.min(stepIdx + 1, state.steps.length - 1)
  const isFinished = stepIdx === state.steps.length - 1

  return {
    ...state,
    currentStepIndex: nextStepIndex,
    steps: updatedSteps,
    completedAt: isFinished ? new Date().toISOString() : null,
  }
}

/**
 * Đánh dấu bước gặp lỗi
 */
export function failStep(
  state: JourneyState,
  stepId: string,
  errorMessage: string
): JourneyState {
  return {
    ...state,
    steps: state.steps.map((s) =>
      s.stepId === stepId
        ? { ...s, status: "FAILED" as JourneyStepStatus, error: errorMessage }
        : s
    ),
  }
}

/**
 * Thử lại bước bị lỗi
 */
export function retryStep(state: JourneyState, stepId: string): JourneyState {
  return {
    ...state,
    steps: state.steps.map((s) =>
      s.stepId === stepId
        ? { ...s, status: "RETRY" as JourneyStepStatus, error: null }
        : s
    ),
  }
}

/**
 * Bỏ qua một bước (chỉ áp dụng cho bước tùy chọn)
 */
export function skipStep(
  state: JourneyState,
  stepId: string,
  definition: JourneyDefinition
): JourneyState {
  const stepDef = definition.steps.find((s) => s.id === stepId)
  if (!stepDef || !stepDef.isOptional) {
    // Không thể bỏ qua bước bắt buộc
    return state
  }

  return advanceStep(state, stepId, { skipped: true })
}

/**
 * Kiểm tra hành trình đã hoàn thành toàn bộ các bước chưa
 */
export function isJourneyComplete(state: JourneyState): boolean {
  if (state.completedAt) return true
  return state.steps.every((s) => s.status === "COMPLETED")
}

/**
 * Lấy bước hiện tại kèm định nghĩa và trạng thái
 */
export function getCurrentStep(
  state: JourneyState,
  definition: JourneyDefinition
): {
  definition: JourneyStepDefinition
  state: JourneyStepState
} | null {
  const currentStepDef = definition.steps[state.currentStepIndex]
  const currentStepState = state.steps[state.currentStepIndex]

  if (!currentStepDef || !currentStepState) return null

  return {
    definition: currentStepDef,
    state: currentStepState,
  }
}
