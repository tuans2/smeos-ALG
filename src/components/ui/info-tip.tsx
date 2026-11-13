"use client"

import * as React from "react"
import { CircleHelp } from "@/components/ui/icon-set/circle-help"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip"
import { cn } from "@/lib/utils"

interface InfoTipProps {
  /** Tên ngắn của mục được giải thích — dùng cho nhãn truy cập */
  label: string
  /** Phần giải thích chi tiết (không dùng cho thông tin bắt buộc — 03c §5b) */
  children: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
  className?: string
}

/**
 * Biểu tượng "?" mở phần giải thích. Hover/focus trên máy tính, chạm để mở trên điện thoại
 * (tooltip Radix không mở khi chạm nên điều khiển `open` thủ công). Phong cách "Nhãn ngắn —
 * giải thích trong ?" — OPERATING_PRINCIPLES §6.
 */
export function InfoTip({ label, children, side = "top", className }: InfoTipProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`Giải thích: ${label}`}
            onClick={(e) => {
              e.stopPropagation()
              setOpen((v) => !v)
            }}
            className={cn(
              "relative z-10 inline-flex shrink-0 items-center justify-center w-8 h-8 rounded-full text-text-muted hover:text-primary hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors",
              className,
            )}
          >
            <CircleHelp className="w-4 h-4" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-64 text-body-sm leading-relaxed text-text">
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
