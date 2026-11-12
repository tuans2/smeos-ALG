"use client"

import React from "react"
import { Loader2, CheckCircle2, Circle } from "@/components/ui/icons"
import type { TaskUiState } from "@/lib/ui-system/task-state"

export interface ProcessingStep {
  id: string
  label: string
  /** Từ vựng chung TaskUiState (03c UX-016); "skipped" = bước không áp dụng */
  status: Extract<TaskUiState, "idle" | "running" | "succeeded"> | "skipped"
}

interface JourneyProcessingStateProps {
  title?: string
  steps: ProcessingStep[]
}

export function JourneyProcessingState({
  title = "AI đang xử lý...",
  steps,
}: JourneyProcessingStateProps) {
  const doneCount = steps.filter((s) => s.status === "succeeded").length
  const total = steps.filter((s) => s.status !== "skipped").length
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0

  return (
    <div className="rounded-2xl border border-primary-border bg-surface p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary-muted flex items-center justify-center shrink-0">
          <Loader2 className="h-5 w-5 text-primary animate-spin motion-reduce:animate-none" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-body font-bold text-text">⚡ {title}</div>
          <div className="text-caption text-text-muted mt-0.5">
            Bạn có thể kiểm tra và chỉnh sửa kết quả sau khi AI hoàn thành.
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-caption text-text-muted">
          <span>Tiến độ</span>
          <span className="font-bold text-primary">{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-surface-alt overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center gap-3">
            {step.status === "succeeded" && (
              <CheckCircle2 className="h-4.5 w-4.5 text-success shrink-0" />
            )}
            {step.status === "running" && (
              <Loader2 className="h-4.5 w-4.5 text-primary animate-spin motion-reduce:animate-none shrink-0" />
            )}
            {step.status === "idle" && (
              <Circle className="h-4.5 w-4.5 text-text-muted/40 shrink-0" />
            )}
            {step.status === "skipped" && (
              <Circle className="h-4.5 w-4.5 text-text-muted/20 shrink-0" />
            )}
            <span
              className={`text-body-sm ${
                step.status === "succeeded"
                  ? "text-text font-semibold"
                  : step.status === "running"
                    ? "text-primary font-bold"
                    : step.status === "skipped"
                      ? "text-text-muted/40 line-through"
                      : "text-text-muted"
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
