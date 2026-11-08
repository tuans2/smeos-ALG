"use client"

import React from "react"
import { Check } from "@/components/ui/icon-set/check"
import { Lock } from "@/components/ui/icon-set/lock"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import type { JourneyStepStatus } from "@/modules/journey/domain/journey-model"

interface StepItem {
  id: string
  label: string
  isOptional?: boolean
}

interface JourneyProgressProps {
  steps: StepItem[]
  currentStepIndex: number
  stepStatuses: JourneyStepStatus[]
  onStepClick?: ((stepIndex: number) => void) | undefined
}

export function JourneyProgress({
  steps,
  currentStepIndex,
  stepStatuses,
  onStepClick,
}: JourneyProgressProps) {
  return (
    <div className="w-full overflow-x-auto py-2">
      <div className="flex items-center min-w-max gap-2 px-1">
        {steps.map((step, idx) => {
          const status = stepStatuses[idx] || "LOCKED"
          const isCurrent = idx === currentStepIndex
          const isCompleted = status === "COMPLETED"
          const isProcessing = status === "PROCESSING"
          const isFailed = status === "FAILED"
          const isLocked = status === "LOCKED"
          const canClick = !isLocked && onStepClick

          return (
            <React.Fragment key={step.id}>
              {/* Connector line between steps */}
              {idx > 0 && (
                <div
                  className={`h-0.5 w-6 sm:w-10 transition-colors ${
                    isCompleted || isCurrent ? "bg-primary" : "bg-border"
                  }`}
                  aria-hidden="true"
                />
              )}

              {/* Step indicator */}
              <div
                role={canClick ? "button" : undefined}
                tabIndex={canClick ? 0 : -1}
                onClick={() => canClick && onStepClick(idx)}
                onKeyDown={(e) => {
                  if (canClick && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault()
                    onStepClick(idx)
                  }
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                  canClick ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary" : ""
                } ${
                  isCurrent
                    ? "bg-selected text-primary border-primary font-bold shadow-xs"
                    : isCompleted
                    ? "bg-surface text-text border-border hover:bg-surface-alt font-medium"
                    : isFailed
                    ? "bg-danger-bg text-danger border-danger font-medium"
                    : "bg-surface-alt text-text-muted border-border cursor-not-allowed"
                }`}
              >
                {/* Step badge icon */}
                <span
                  className={`flex items-center justify-center w-5 h-5 rounded-full text-caption font-bold ${
                    isCompleted
                      ? "bg-primary text-surface"
                      : isCurrent
                      ? "bg-primary text-surface"
                      : isProcessing
                      ? "bg-info-bg text-info"
                      : isFailed
                      ? "bg-danger text-surface"
                      : "bg-surface text-text-muted border border-border"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-3 h-3" aria-hidden="true" />
                  ) : isProcessing ? (
                    <Loader2 className="w-3 h-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  ) : isFailed ? (
                    <AlertCircle className="w-3 h-3" aria-hidden="true" />
                  ) : isLocked ? (
                    <Lock className="w-2.5 h-2.5" aria-hidden="true" />
                  ) : (
                    idx + 1
                  )}
                </span>

                <span className="text-body-sm whitespace-nowrap">
                  {step.label}
                  {step.isOptional && (
                    <span className="ml-1 text-caption text-text-muted font-normal">
                      (Tùy chọn)
                    </span>
                  )}
                </span>
              </div>
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
