"use client"

import { Button } from "@/components/ui/button"
import React from "react"
import {
  ExternalLink,
  Eye,
  FileEdit,
  CreditCard,
  CheckCircle2,
  Flower2,
  Camera,
  Truck,
  PartyPopper,
  MessageSquare,
} from "@/components/ui/icons"
import type { TrackingPipelineStepId, TrackingStepState } from "@/modules/greeting-card/domain/tracking-pipeline-types"
import { STEP_OWNER_LABEL, STEP_SLA_RULES, type StepOwner } from "@/modules/greeting-card/domain/step-sla"

interface TrackingStepperViewProps {
  steps: TrackingStepState[]
  currentStepId: TrackingPipelineStepId
  onSelectStepNote?: (stepId: TrackingPipelineStepId) => void
  /** Bước hiện tại đã quá thời gian chuẩn — tô đỏ thay vì màu thường. */
  stuck?: boolean
}

/** Cùng một quy trình ở mọi tab: mỗi bước ghi rõ phần việc của ai (Sale · Điều hành · Điều phối). */
const OWNER_TEXT: Record<StepOwner, string> = { SALE: "text-info", ADMIN: "text-warning-text", COORDINATOR: "text-success" }
const ownerOf = (id: TrackingPipelineStepId): StepOwner | null => STEP_SLA_RULES.find((r) => r.stepId === id)?.owner ?? null

function getStepIcon(stepId: TrackingPipelineStepId, size = 14) {
  switch (stepId) {
    case "STEP_1_OPENED":
      return <ExternalLink size={size} />
    case "STEP_2_CHOOSING":
      return <Eye size={size} />
    case "STEP_3_FILLING_FORM":
      return <FileEdit size={size} />
    case "STEP_4_PAYMENT_PENDING":
      return <CreditCard size={size} />
    case "STEP_5_PAYMENT_CONFIRMED":
      return <CheckCircle2 size={size} />
    case "STEP_6_ARRANGING":
      return <Flower2 size={size} />
    case "STEP_7_READY_QC":
      return <Camera size={size} />
    case "STEP_8_DELIVERING":
      return <Truck size={size} />
    case "STEP_9_COMPLETED":
      return <PartyPopper size={size} />
  }
}

export function TrackingStepperView({
  steps,
  onSelectStepNote,
  stuck = false,
}: TrackingStepperViewProps) {
  return (
    <div className="w-full overflow-x-auto py-2">
      <div className="flex items-center min-w-[720px] relative">
        {steps.map((step, idx) => {
          const isCompleted = step.status !== "pending" && step.status !== "current"
          const isCurrent = step.status === "current"
          const isLast = idx === steps.length - 1

          return (
            <React.Fragment key={step.id}>
              {/* Step Item */}
              <div className="flex flex-col items-center relative group flex-1">
                {/* Node Button */}
                <Button variant="ghost"
                  type="button"
                  onClick={() => onSelectStepNote?.(step.id)}
                  title={`${step.title} (${step.roleResponsible}) — Nhấp để xem/thêm ghi chú nội bộ`}
                  className={`px-0 py-0 text-[length:inherit] font-[inherit] gap-0 relative z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? "bg-success text-white shadow-xs hover:scale-105 hover:bg-success"
                      : isCurrent && stuck
                      ? "bg-danger text-white ring-4 ring-danger/20 shadow-sm hover:bg-danger"
                      : isCurrent
                      ? "bg-primary text-white ring-4 ring-primary/20 shadow-sm animate-pulse motion-reduce:animate-none hover:bg-primary"
                      : "bg-surface border border-border text-text-muted hover:border-primary/50 hover:bg-surface"
                  }`}
                >
                  {isCompleted ? <CheckCircle2 size={16} /> : getStepIcon(step.id, 16)}

                </Button>

                {/* Step Info */}
                <div className="flex flex-col items-center text-center mt-2 px-0.5 w-full">
                  <span
                    className={`text-caption font-bold leading-tight line-clamp-1 ${
                      isCurrent
                        ? "text-primary underline decoration-primary underline-offset-2"
                        : isCompleted
                        ? "text-text"
                        : "text-text-muted"
                    }`}
                  >
                    {step.shortTitle}
                  </span>
                  {(() => {
                    const owner = ownerOf(step.id)
                    return (
                      <span className={`text-caption font-semibold mt-0.5 line-clamp-1 ${owner ? OWNER_TEXT[owner] : "text-text-muted"}`}>
                        {owner ? STEP_OWNER_LABEL[owner] : "Hoàn tất"}
                      </span>
                    )
                  })()}

                  {/* Gợi ý mở note */}
                  <Button variant="ghost"
                    type="button"
                    onClick={() => onSelectStepNote?.(step.id)}
                    className="h-auto p-0 font-[inherit] mt-1 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-0.5 text-caption text-primary hover:underline"
                  >
                    <MessageSquare size={10} />
                    <span>Lưu ý</span>
                  </Button>
                </div>
              </div>

              {/* Connector line between steps */}
              {!isLast && (
                <div
                  className={`h-0.5 flex-[0.35] mb-8 transition-colors ${
                    isCompleted ? "bg-success" : "bg-border"
                  }`}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
