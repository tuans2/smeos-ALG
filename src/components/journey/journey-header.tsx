"use client"

import React from "react"
import { ArrowLeft } from "@/components/ui/icon-set/arrow-left"
import { Button } from "@/components/ui/button"

interface JourneyHeaderProps {
  goal: string
  description?: string
  currentStepIndex: number
  totalSteps: number
  onBackToHome: () => void
}

export function JourneyHeader({
  goal,
  description,
  currentStepIndex,
  totalSteps,
  onBackToHome,
}: JourneyHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border bg-surface px-4 py-3 rounded-xl">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onBackToHome}
          className="w-9 h-9 p-0"
          title="Quay lại danh sách tác vụ"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        </Button>

        <div>
          <h2 className="text-title font-bold text-text leading-tight">
            {goal}
          </h2>
          {description && (
            <p className="text-meta text-text-muted mt-0.5">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        <span className="text-caption font-semibold px-2.5 py-1 rounded-md bg-selected text-primary border border-border">
          Bước {currentStepIndex + 1} / {totalSteps}
        </span>
      </div>
    </div>
  )
}
