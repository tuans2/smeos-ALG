/**
 * Bộ ghép quy trình tự động (Workflow Composer) — Kiến trúc Journey-First.
 * Nguồn đặc tả: ALG_CORE_JOURNEY_FIRST_UX_ARCHITECTURE_FINAL.md (§7.2, §20)
 *
 * Luật Clean Architecture: Thuần túy không import React, không import Prisma.
 */

import type {
  JourneyDefinition,
  JourneyStepDefinition,
} from "./journey-model"

export interface WorkflowComposeOptions {
  id: string
  goal: string
  description: string
  icon: string
  badgeText?: string
  roleScope: JourneyDefinition["roleScope"]
  steps: JourneyStepDefinition[]
}

/**
 * Tạo một định nghĩa Combo Journey hoàn chỉnh từ các bước được chỉ định
 */
export function composeWorkflow(options: WorkflowComposeOptions): JourneyDefinition {
  // Liên kết các bước theo thứ tự tuần tự
  const chainedSteps: JourneyStepDefinition[] = options.steps.map((step, idx) => {
    const nextStep = options.steps[idx + 1]
    return {
      ...step,
      nextStepId: nextStep ? nextStep.id : null,
    }
  })

  return {
    id: options.id,
    goal: options.goal,
    description: options.description,
    icon: options.icon,
    badgeText: options.badgeText || "Gói quy trình",
    roleScope: options.roleScope,
    category: "COMBO",
    steps: chainedSteps,
  }
}

/**
 * Loại bỏ các bước đã bị tắt (tùy chọn) và tái liên kết luồng chạy
 */
export function filterExcludedSteps(
  journey: JourneyDefinition,
  excludedStepIds: string[]
): JourneyDefinition {
  if (!excludedStepIds || excludedStepIds.length === 0) {
    return journey
  }

  const excludedSet = new Set(excludedStepIds)
  // Chỉ lọc bỏ những bước là tùy chọn (isOptional = true)
  const remainingSteps = journey.steps.filter(
    (step) => !(excludedSet.has(step.id) && step.isOptional)
  )

  // Tái liên kết các bước kế tiếp
  const reChainedSteps: JourneyStepDefinition[] = remainingSteps.map((step, idx) => {
    const nextStep = remainingSteps[idx + 1]
    return {
      ...step,
      nextStepId: nextStep ? nextStep.id : null,
    }
  })

  return {
    ...journey,
    steps: reChainedSteps,
  }
}
