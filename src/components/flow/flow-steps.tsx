"use client"

import { useState } from "react"
import { Check } from "@/components/ui/icon-set/check"
import { Circle } from "@/components/ui/icon-set/circle"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { X } from "@/components/ui/icon-set/x"
import { RotateCcw } from "@/components/ui/icon-set/rotate-ccw"
import { Ban } from "@/components/ui/icon-set/ban"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export interface FlowStep {
  key: string
  label: string
}

export interface FlowStepStatus {
  key: string
  status: "succeeded" | "active" | "pending" | "error" | "canceled"
}

export interface FlowStepsProps {
  steps: FlowStep[]
  currentStep: string
  statuses?: FlowStepStatus[]
  cancellable?: boolean
  onCancel?: () => void
  showLog?: boolean
  logs?: { seq: number; text: string; at: string }[]
}

export function FlowSteps({
  steps,
  currentStep,
  statuses,
  cancellable,
  onCancel,
  showLog,
  logs,
}: FlowStepsProps) {
  const [expanded, setExpanded] = useState(showLog ?? false)

  const currentIndex = steps.findIndex((s) => s.key === currentStep)

  const getStepStatus = (index: number): FlowStepStatus["status"] => {
    if (statuses && steps[index]) {
      const found = statuses.find((s) => s.key === steps[index]!.key)
      if (found) return found.status
    }
    if (index < currentIndex) return "succeeded"
    if (index === currentIndex) return "active"
    return "pending"
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      {steps.map((step, index) => {
        const status = getStepStatus(index)
        const isDone = status === "succeeded"
        const isActive = status === "active"
        const isError = status === "error"
        const isCancelled = status === "canceled"

        return (
          <div key={step.key} className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full",
                  isDone && "bg-secondary",
                  isActive && "bg-primary animate-pulse motion-reduce:animate-none",
                  isError && "bg-danger",
                  status === "pending" && "border-2 border-border",
                  isCancelled && "bg-text-muted"
                )}
              >
                {isDone && <Check size={13} strokeWidth={3} color="white" />}
                {isActive && <Circle size={10} strokeWidth={3} color="white" />}
                {isError && <AlertCircle size={13} strokeWidth={2} color="white" />}
                {isCancelled && <Ban size={11} strokeWidth={2} color="white" />}
                {status === "pending" && <Circle size={10} strokeWidth={2} className="text-text-muted" />}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-0.5 flex-1 min-h-[16px]",
                    isDone ? "bg-secondary" : "bg-border"
                  )}
                />
              )}
            </div>
            <div className="pb-3">
              <div
                className={cn(
                  "text-body-sm",
                  isDone && "font-semibold text-text",
                  isActive && "font-bold text-primary",
                  (status === "pending" || isCancelled) && "text-text-muted",
                  isError && "font-bold text-danger"
                )}
              >
                {step.label}
              </div>
              {isError && (
                <div className="mt-0.5 text-caption text-danger">
                  Có lỗi — cần xử lý trước khi tiếp
                </div>
              )}
            </div>
          </div>
        )
      })}

      {cancellable && (
        <div className="border-t border-border pt-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={onCancel}
            className="flex items-center gap-1.5"
          >
            <X size={13} strokeWidth={2} /> Huỷ lượt chạy
          </Button>
        </div>
      )}

      {showLog && logs && logs.length > 0 && (
        <div className="border-t border-border pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center justify-between text-meta font-bold text-text h-auto p-0"
          >
            <span>Nhật ký</span>
            {expanded ? (
              <ChevronUpIcon />
            ) : (
              <ChevronDownIcon />
            )}
          </Button>
          {expanded && (
            <div className="mt-2 max-h-40 overflow-y-auto rounded-lg bg-surface-alt p-2">
              {logs.map((log) => (
                <div key={log.seq} className="text-caption text-text-muted">
                  <span className="font-mono text-caption text-secondary-text">
                    [{log.at}]
                  </span>{" "}
                  {log.text}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

function ChevronUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
      <path d="m18 15-6-6-6 6" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function FlowStepBar({
  steps,
  currentStep,
}: {
  steps: FlowStep[]
  currentStep: string
}) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep)

  return (
    <div className="flex gap-1.5 px-[18px] pb-3">
      {steps.map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1 flex-1 rounded-full transition-colors",
            i <= currentIndex ? "bg-primary" : "bg-border"
          )}
        />
      ))}
    </div>
  )
}

export function JobErrorDisplay({
  error,
  onRetry,
  onBack,
}: {
  error: string
  onRetry?: () => void
  onBack?: () => void
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-bg">
        <AlertCircle size={26} strokeWidth={1.8} className="text-danger" />
      </div>
      <div className="text-title-sm font-bold">Đang xử lý — chưa xong</div>
      <div className="max-w-xs text-meta leading-relaxed text-text-muted">{error}</div>
      <div className="flex w-full max-w-xs flex-col gap-2">
        {onRetry && (
          <Button onClick={onRetry} className="w-full">
            <RotateCcw size={15} strokeWidth={2} /> Thử lại
          </Button>
        )}
        {onBack && (
          <Button variant="secondary" className="w-full" onClick={onBack}>
            Quay lại
          </Button>
        )}
      </div>
    </div>
  )
}
