"use client"

import React from "react"
import { AlertTriangle, Clock } from "@/components/ui/icons"
import { STEP_OWNER_LABEL, formatMinutes, type StepOwner } from "@/modules/greeting-card/domain/step-sla"
import type { TrackingPipelineItem } from "@/modules/greeting-card/domain/tracking-pipeline-types"

/** Khối trạng thái đầu thẻ: bước hiện tại (to nhất), đã ở bước này bao lâu, và cảnh báo kẹt. */
export function WorkStatus({ item, me, now, code }: { item: TrackingPipelineItem; me: StepOwner; now: number; code?: React.ReactNode }) {
  const waited = Math.max(0, Math.floor((now - Date.parse(item.stepStartedAt)) / 60_000))
  const mine = item.stuck?.owner === me
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-title-sm font-extrabold ${item.isCancelled ? "text-danger" : mine ? "text-danger" : "text-primary"}`}>
            {item.currentStepTitle}
          </p>
          {item.isCancelled && item.cancelReason && (
            <div className="mt-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-caption font-bold bg-danger-bg text-danger">
                {item.cancelReason}
              </span>
            </div>
          )}
          <p className="mt-0.5 inline-flex items-center gap-1 text-caption text-text-muted">
            <Clock size={12} aria-hidden="true" /> {item.isCancelled ? "Đã ghi nhận dừng xử lý" : `Ở bước này ${formatMinutes(waited)}`}
          </p>
        </div>
        {code}
      </div>
      {item.stuck && (
        <div role={mine ? "alert" : undefined}
          className={`flex items-start gap-2 rounded-xl p-2.5 text-body-sm font-semibold ${mine ? "bg-danger-bg text-danger" : "bg-warning-bg text-warning-text"}`}>
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{mine ? "Cần bạn: " : `Đang chờ ${STEP_OWNER_LABEL[item.stuck.owner]}: `}{item.stuck.message}</span>
        </div>
      )}
    </div>
  )
}
