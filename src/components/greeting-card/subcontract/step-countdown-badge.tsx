"use client"

import React from "react"
import { Clock, AlertTriangle } from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import type { CountdownState } from "@/modules/greeting-card/domain/subcontract-countdown"

export interface StepCountdownBadgeProps {
  countdown: CountdownState | null
  labelPrefix?: string
  isCompleted?: boolean
  className?: string
}

export function StepCountdownBadge({
  countdown,
  labelPrefix = "Hạn chót",
  isCompleted = false,
  className,
}: StepCountdownBadgeProps) {
  if (isCompleted || !countdown) return null

  const { isOverdue, formatted, targetTimeStr } = countdown
  const isUrgent = !isOverdue && countdown.secondsRemaining <= 15 * 60 // Dưới 15 phút

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption font-bold transition-all",
        isOverdue
          ? "bg-danger-bg text-danger border border-danger/30 animate-pulse motion-reduce:animate-none"
          : isUrgent
          ? "bg-warning-bg text-warning-text border border-warning/30"
          : "bg-surface-muted text-text-muted border border-border",
        className
      )}
      title={`Hạn hoàn thành: ${targetTimeStr || "Đang tính"}`}
    >
      {isOverdue ? (
        <AlertTriangle size={12} className="shrink-0 text-danger" />
      ) : (
        <Clock size={12} className="shrink-0 text-current opacity-80" />
      )}
      <span className="truncate">
        {targetTimeStr ? `${labelPrefix} ${targetTimeStr} • ` : ""}
        <strong className="font-extrabold">{formatted}</strong>
      </span>
    </div>
  )
}
