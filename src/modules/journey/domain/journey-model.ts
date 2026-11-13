/**
 * Mô hình dữ liệu Journey (Hành trình người dùng) — Kiến trúc Journey-First.
 * Nguồn đặc tả: ALG_CORE_JOURNEY_FIRST_UX_ARCHITECTURE_FINAL.md (§17, §18)
 *
 * Luật thuần Clean Architecture — không import React, không import Prisma.
 */

import type { RoleUxGroup } from "@/modules/organization/domain/role-ux-catalog"

export type JourneyCategory = "SINGLE" | "COMBO" | "AI_SUGGEST"

export type JourneyStepStatus =
  | "LOCKED"
  | "AVAILABLE"
  | "INPUT_REQUIRED"
  | "READY"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "RETRY"

export type JourneyInputType =
  | "IMAGE_UPLOAD"
  | "TEXT_INPUT"
  | "PRODUCT_SELECT"
  | "CUSTOMER_SELECT"
  | "ORDER_INPUT"
  | "CONFIG_SELECT"
  | "CONFIRMATION"
  | "NONE"

export interface JourneyStepDefinition {
  id: string
  label: string
  description?: string
  inputType: JourneyInputType
  requiredCapability?: string // Mã năng lực (ẩn bước nếu thiếu quyền)
  featureEntitlement?: string // Mã gói dịch vụ (ẩn bước nếu chưa kích hoạt)
  isOptional: boolean
  nextStepId: string | null
}

export interface JourneyDefinition {
  id: string
  goal: string
  description: string
  icon: string
  badgeText?: string
  roleScope: RoleUxGroup
  category: JourneyCategory
  steps: JourneyStepDefinition[]
  primaryHref?: string // Đường dẫn điều hướng trực tiếp nếu là Single Action
}

/**
 * Kiểm tra tính hợp lệ của định nghĩa một Journey
 */
export function validateJourneyDefinition(journey: JourneyDefinition): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!journey.id || journey.id.trim() === "") {
    errors.push("Mã journey không được để trống")
  }
  if (!journey.goal || journey.goal.trim() === "") {
    errors.push("Mục tiêu journey không được để trống")
  }
  if (!journey.roleScope) {
    errors.push("Phạm vi vai (roleScope) không được để trống")
  }
  if (!journey.steps || journey.steps.length === 0) {
    errors.push("Journey phải có ít nhất 1 bước")
  } else {
    const stepIds = new Set<string>()
    journey.steps.forEach((step, idx) => {
      if (!step.id) {
        errors.push(`Bước thứ ${idx + 1} thiếu mã bước (id)`)
      } else if (stepIds.has(step.id)) {
        errors.push(`Trùng lặp mã bước: ${step.id}`)
      } else {
        stepIds.add(step.id)
      }
      if (!step.label) {
        errors.push(`Bước ${step.id || idx + 1} thiếu nhãn hiển thị (label)`)
      }
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
