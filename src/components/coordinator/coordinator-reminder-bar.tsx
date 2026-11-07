"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Bell } from "@/components/ui/icon-set/bell"
import { AlertOctagon } from "@/components/ui/icon-set/alert-octagon"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { ChevronDown } from "@/components/ui/icon-set/chevron-down"
import { ChevronUp } from "@/components/ui/icon-set/chevron-up"
import { Settings2 } from "@/components/ui/icon-set/settings2"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSession } from "@/lib/session"
import { CoordinatorReminderCard } from "./coordinator-reminder-card"
import { CoordinatorReminderSettingsModal } from "./coordinator-reminder-settings-modal"
import type {
  ActiveReminderItem,
  CoordinatorMilestoneCode,
} from "@/modules/coordinator/domain/dispatch-reminder-types"

interface RemindersResponse {
  reminders: ActiveReminderItem[]
  totalActive: number
  totalOverdue: number
  totalCritical: number
}

interface CoordinatorReminderBarProps {
  onSelectOrder?: (orderId: string) => void
}

export function CoordinatorReminderBar({ onSelectOrder }: CoordinatorReminderBarProps) {
  const canConfigure = useSession().can("R12")
  const [data, setData] = useState<RemindersResponse>({
    reminders: [],
    totalActive: 0,
    totalOverdue: 0,
    totalCritical: 0,
  })
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const fetchReminders = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/v1/coordinator/reminders")
      if (!res.ok) return
      const json = (await res.json()) as RemindersResponse
      setData(json)
    } catch {
      // Ignore network errors on polling
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải nhắc việc khi mount rồi làm mới định kỳ; setState nằm trong hàm tải
    void fetchReminders()
    const timer = setInterval(() => {
      void fetchReminders()
    }, 30000) // Tự động làm mới mỗi 30s
    return () => clearInterval(timer)
  }, [fetchReminders])

  const handleAcknowledge = async (
    orderId: string,
    milestone: CoordinatorMilestoneCode,
    action: "ACKNOWLEDGED" | "SNOOZED" | "DISMISSED",
    snoozeMinutes?: number
  ) => {
    await fetch("/api/v1/coordinator/reminders/acknowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        milestone,
        action,
        snoozeMinutes,
      }),
    })
    await fetchReminders()
  }

  const { totalActive, totalOverdue, totalCritical, reminders } = data
  const hasReminders = totalActive > 0

  return (
    <>
      <div
        className={`rounded-2xl border transition-all ${
          totalCritical > 0
            ? "border-danger/40 bg-danger-bg/25 shadow-xs"
            : totalOverdue > 0
            ? "border-warning/40 bg-warning-bg/20"
            : hasReminders
            ? "border-primary/30 bg-primary/5"
            : "border-border bg-surface"
        }`}
      >
        {/* ── Thanh thông báo tóm tắt ──────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5">
          <div className="flex items-center gap-3">
            <div
              className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                totalCritical > 0
                  ? "bg-danger text-white shadow-xs"
                  : totalOverdue > 0
                  ? "bg-warning text-white"
                  : hasReminders
                  ? "bg-primary text-white"
                  : "bg-surface-alt text-text-muted"
              }`}
            >
              {totalCritical > 0 ? (
                <AlertOctagon size={18} />
              ) : totalOverdue > 0 ? (
                <AlertTriangle size={18} />
              ) : hasReminders ? (
                <Bell size={18} />
              ) : (
                <CheckCircle2 size={18} />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-body-sm font-bold text-text">
                  Nhắc việc điều phối theo tiến độ đơn
                </span>
                {totalCritical > 0 && (
                  <Badge tone="danger" className="text-caption font-extrabold px-2 py-0.5">
                    {totalCritical} đơn khẩn cấp
                  </Badge>
                )}
                {totalOverdue > 0 && (
                  <Badge tone="warning" className="text-caption font-bold px-2 py-0.5">
                    {totalOverdue} đơn quá hạn
                  </Badge>
                )}
                {hasReminders && (
                  <span className="text-caption text-text-muted">
                    · Tổng {totalActive} việc cần làm
                  </span>
                )}
              </div>
              <p className="text-caption text-text-muted mt-0.5">
                {totalCritical > 0
                  ? "Có đơn hàng đã quá hạn quy chuẩn! Cần can thiệp gấp để kịp giờ giao."
                  : totalOverdue > 0
                  ? "Có các mốc nghiệp vụ cần liên hệ xưởng hoặc shipper ngay."
                  : hasReminders
                  ? "Hệ thống tự động theo dõi tiến độ theo 6 mốc chuẩn kịp thời & chính xác."
                  : "Toàn bộ đơn hàng đang đúng tiến độ cam kết. Không có việc tồn đọng."}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {canConfigure && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              className="h-8 px-2.5 text-caption gap-1.5 border-border hover:bg-surface"
              title="Cài đặt chính sách mốc nhắc"
              aria-label="Cài đặt chính sách mốc nhắc"
            >
              <Settings2 size={13} />
              <span className="hidden sm:inline">Cài đặt mốc</span>
            </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void fetchReminders()}
              disabled={isLoading}
              className="h-8 px-2.5 text-caption gap-1 border-border hover:bg-surface"
              title="Làm mới danh sách nhắc việc"
              aria-label="Làm mới danh sách nhắc việc"
            >
              <RefreshCw size={12} className={isLoading ? "animate-spin motion-reduce:animate-none" : ""} />
            </Button>

            {hasReminders && (
              <Button
                type="button"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className={`h-8 px-3 text-caption font-bold gap-1.5 ${
                  totalCritical > 0
                    ? "bg-danger hover:bg-danger-dark text-white"
                    : "bg-primary hover:bg-primary-dark text-white"
                }`}
              >
                <span>{isExpanded ? "Thu gọn" : `Xem việc (${totalActive})`}</span>
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </Button>
            )}
          </div>
        </div>

        {/* ── Danh sách chi tiết các thẻ nhắc việc (Khi mở rộng) ────────── */}
        {isExpanded && hasReminders && (
          <div className="border-t border-border p-4 bg-surface-alt/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-caption font-bold text-text-muted uppercase">
                Danh sách các việc cần xử lý ({reminders.length})
              </span>
              <span className="text-caption text-text-muted">
                1-click copy tin nhắn gửi xưởng hoặc shipper
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {reminders.map((reminder) => (
                <CoordinatorReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  onAcknowledge={handleAcknowledge}
                  onViewOrder={onSelectOrder}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal Cài đặt chính sách nhắc việc */}
      <CoordinatorReminderSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={() => void fetchReminders()}
      />
    </>
  )
}
