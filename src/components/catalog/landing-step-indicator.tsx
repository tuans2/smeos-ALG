"use client"

import { Button } from "@/components/ui/button"
import React from "react"
import { Check } from "@/components/ui/icons"

export interface WizardStepItem {
  id: number
  title: string
  description: string
}

export const LANDING_WIZARD_STEPS: WizardStepItem[] = [
  { id: 1, title: "Dịp & Phong cách", description: "Sự kiện và kiểu trang" },
  { id: 2, title: "Chọn hoa", description: "Danh mục sản phẩm" },
  { id: 3, title: "Nội dung", description: "Lời giới thiệu và các phần" },
  { id: 4, title: "Xem trước", description: "Kiểm tra giao diện" },
  { id: 5, title: "Xuất bản", description: "Nhận Link & QR" },
]

interface LandingStepIndicatorProps {
  currentStep: number
  onStepClick?: (step: number) => void
  maxAccessibleStep?: number
}

export function LandingStepIndicator({
  currentStep,
  onStepClick,
  maxAccessibleStep = 5,
}: LandingStepIndicatorProps) {
  return (
    <div className="w-full bg-surface border border-border rounded-xl p-3 shadow-2xs">
      <div className="flex items-center justify-between gap-1 overflow-x-auto">
        {LANDING_WIZARD_STEPS.map((step, idx) => {
          const isDone = currentStep > step.id
          const isCurrent = currentStep === step.id
          const isClickable = onStepClick && step.id <= maxAccessibleStep

          return (
            <React.Fragment key={step.id}>
              <Button variant="ghost"
                type="button"
                disabled={!isClickable}
                aria-label={`Bước ${step.id}: ${step.title}${isDone ? " (đã xong)" : ""}`}
                aria-current={isCurrent ? "step" : undefined}
                onClick={() => isClickable && onStepClick(step.id)}
                className={`h-auto text-[length:inherit] justify-start flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors whitespace-nowrap ${
                  isCurrent
                    ? "bg-primary-muted text-primary font-bold hover:bg-primary-muted"
                    : isDone
                    ? "text-text hover:bg-surface-alt cursor-pointer"
                    : "text-text-muted cursor-not-allowed"
                }`}
              >
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-caption font-bold shrink-0 ${
                    isDone
                      ? "bg-success text-surface"
                      : isCurrent
                      ? "bg-primary text-surface"
                      : "bg-surface-alt border border-border text-text-muted"
                  }`}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : step.id}
                </div>
                <div className="hidden sm:block">
                  <div className="text-caption font-semibold leading-tight">{step.title}</div>
                  <div className="text-caption text-text-muted leading-tight">{step.description}</div>
                </div>
              </Button>

              {idx < LANDING_WIZARD_STEPS.length - 1 && (
                <div className="h-[1px] flex-1 bg-border mx-1 min-w-4" />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
