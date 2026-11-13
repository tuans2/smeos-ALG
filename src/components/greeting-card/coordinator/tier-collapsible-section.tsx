"use client"

import { Button } from "@/components/ui/button"
import React, { useState } from "react"
import { AlertCircle, ChevronDown, ChevronRight, Calendar, CheckCircle2 } from "@/components/ui/icons"

interface TierSectionProps {
  type: "OVERDUE" | "FUTURE" | "DONE"
  count: number
  children: React.ReactNode
  defaultExpanded?: boolean
}

export function TierCollapsibleSection({
  type,
  count,
  children,
  defaultExpanded = false,
}: TierSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  if (count === 0) return null

  if (type === "OVERDUE") {
    return (
      <div className="flex flex-col gap-1.5 rounded-xl border border-danger/30 bg-danger-bg/20 p-1.5">
        <Button variant="ghost"
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="h-auto gap-0 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-caption font-bold text-danger hover:bg-danger-bg/40 transition-colors"
          aria-expanded={expanded}
        >
          <div className="flex items-center gap-1.5">
            <AlertCircle size={14} className="shrink-0 text-danger animate-pulse motion-reduce:animate-none" />
            <span>{count} đơn quá hạn</span>
          </div>
          <div className="flex items-center gap-1 text-caption text-danger/80">
            <span>{expanded ? "Thu gọn" : "Xem"}</span>
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        </Button>

        {expanded && <div className="flex flex-col gap-2 pt-1">{children}</div>}
      </div>
    )
  }

  // Tương lai (FUTURE) và Đã giao (DONE) cùng kiểu thu gọn nhẹ
  const Icon = type === "DONE" ? CheckCircle2 : Calendar
  const label = type === "DONE" ? `${count} đơn đã giao trong 24 giờ` : `${count} đơn ca sau & đặt trước`
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface-alt/40 p-1.5 mt-1">
      <Button variant="ghost"
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="h-auto gap-0 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-caption font-medium text-text-muted hover:bg-surface-alt transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-1.5">
          <Icon size={13} className="shrink-0 text-text-muted" />
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-1 text-caption text-text-muted">
          <span>{expanded ? "Thu gọn" : "Xem"}</span>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </Button>

      {expanded && <div className="flex flex-col gap-2 pt-1">{children}</div>}
    </div>
  )
}
