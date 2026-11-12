"use client"

import React from "react"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { UserCheck } from "@/components/ui/icon-set/user-check"
import { Button } from "@/components/ui/button"

export interface HumanTakeoverBannerProps {
  reason: string
  customerName: string
  onAcceptTakeover: () => void
  onDismiss?: () => void
}

/**
 * HumanTakeoverBanner (Thẻ cảnh báo tiếp quản hội thoại tư vấn M10)
 */
export function HumanTakeoverBanner({
  reason,
  customerName,
  onAcceptTakeover,
  onDismiss,
}: HumanTakeoverBannerProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning-bg p-4 text-warning-text shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning-text">
          <AlertCircle size={20} />
        </div>
        <div>
          <div className="text-caption font-bold uppercase tracking-wider text-warning-text">
            Yêu cầu nhân viên can thiệp: {customerName}
          </div>
          <div className="text-caption text-warning-text mt-0.5">{reason}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onDismiss && (
          <Button variant="ghost" size="sm" onClick={onDismiss} className="text-warning-text hover:text-warning-text/80 text-caption">
            Bỏ qua
          </Button>
        )}
        <Button size="sm" onClick={onAcceptTakeover} className="bg-warning hover:bg-warning/90 text-text gap-1.5 text-caption">
          <UserCheck size={14} />
          Nhận xử lý ngay
        </Button>
      </div>
    </div>
  )
}
