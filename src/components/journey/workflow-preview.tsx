"use client"

import React, { useState } from "react"
import { Play } from "@/components/ui/icon-set/play"
import { Check } from "@/components/ui/icon-set/check"
import { ChevronRight } from "@/components/ui/icon-set/chevron-right"
import { X } from "@/components/ui/icon-set/x"
import { Button } from "@/components/ui/button"
import type { JourneyDefinition } from "@/modules/journey/domain/journey-model"

interface WorkflowPreviewProps {
  journey: JourneyDefinition
  onStartWorkflow: (excludedStepIds: string[]) => void
  onCancel: () => void
}

export function WorkflowPreview({
  journey,
  onStartWorkflow,
  onCancel,
}: WorkflowPreviewProps) {
  const [excludedStepIds, setExcludedStepIds] = useState<string[]>([])

  const toggleStep = (stepId: string, isOptional: boolean) => {
    if (!isOptional) return // Không thể bỏ chọn bước bắt buộc
    setExcludedStepIds((prev) =>
      prev.includes(stepId) ? prev.filter((id) => id !== stepId) : [...prev, stepId]
    )
  }

  const handleStart = () => {
    onStartWorkflow(excludedStepIds)
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-5 sm:p-6 rounded-2xl border border-border bg-surface shadow-md space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between pb-4 border-b border-border">
        <div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-semibold bg-selected text-primary mb-2">
            XEM TRƯỚC QUY TRÌNH
          </span>
          <h2 className="text-title font-extrabold text-text">
            {journey.goal}
          </h2>
          <p className="text-body-sm text-text-muted mt-1">
            {journey.description}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-8 w-8 p-0 text-text-muted hover:bg-surface-alt"
          title="Đóng xem trước"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </Button>
      </div>

      {/* Step Pipeline List */}
      <div className="space-y-3">
        <h3 className="text-body-sm font-bold text-text">
          Các bước trong quy trình ({journey.steps.length - excludedStepIds.length} / {journey.steps.length} bước kích hoạt)
        </h3>

        <div className="space-y-2">
          {journey.steps.map((step, idx) => {
            const isExcluded = excludedStepIds.includes(step.id)

            return (
              <div
                key={step.id}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                  isExcluded
                    ? "bg-surface-alt/60 border-border opacity-50"
                    : "bg-surface border-border hover:border-primary/40 shadow-xs"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-selected text-primary text-caption font-bold">
                    {idx + 1}
                  </span>
                  <div>
                    <h4 className="text-body-sm font-bold text-text">
                      {step.label}
                    </h4>
                    {step.description && (
                      <p className="text-caption text-text-muted mt-0.5">
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {step.isOptional ? (
                    <Button
                      type="button"
                      variant={isExcluded ? "outline" : "secondary"}
                      size="sm"
                      onClick={() => toggleStep(step.id, true)}
                      className="h-7 text-caption font-semibold"
                    >
                      {isExcluded ? "Đã tắt" : "Tùy chọn (Bật)"}
                    </Button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-caption text-text-muted font-medium px-2 py-0.5 rounded bg-surface-alt">
                      <Check className="w-3 h-3 text-success" aria-hidden="true" />
                      Bắt buộc
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Hủy bỏ
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={handleStart}
          className="gap-2"
        >
          <Play className="w-4 h-4 fill-current" aria-hidden="true" />
          <span>Bắt đầu quy trình ngay</span>
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
