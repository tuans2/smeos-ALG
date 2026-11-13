"use client"

import React, { useState } from "react"
import { Clock } from "@/components/ui/icon-set/clock"
import { Copy } from "@/components/ui/icon-set/copy"
import { Check } from "@/components/ui/icon-set/check"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { AlertOctagon } from "@/components/ui/icon-set/alert-octagon"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { CalendarClock } from "@/components/ui/icon-set/calendar-clock"
import { XCircle } from "@/components/ui/icon-set/x-circle"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type {
  ActiveReminderItem,
  CoordinatorMilestoneCode,
} from "@/modules/coordinator/domain/dispatch-reminder-types"

interface CoordinatorReminderCardProps {
  reminder: ActiveReminderItem
  onAcknowledge: (
    orderId: string,
    milestone: CoordinatorMilestoneCode,
    action: "ACKNOWLEDGED" | "SNOOZED" | "DISMISSED",
    snoozeMinutes?: number | undefined
  ) => Promise<void>
  onViewOrder?: ((orderId: string) => void) | undefined
}

const MILESTONE_BADGE_STYLE: Record<CoordinatorMilestoneCode, string> = {
  M0: "bg-primary/10 text-primary border-primary/20",
  M1: "bg-warning-bg text-warning-text border-warning/30",
  M2: "bg-info/10 text-info border-info/30",
  M3: "bg-warning-bg text-warning-text border-warning/30",
  M4: "bg-primary/10 text-primary border-primary/30",
  M5: "bg-success-bg text-success border-success/30",
}

export function CoordinatorReminderCard({
  reminder,
  onAcknowledge,
  onViewOrder,
}: CoordinatorReminderCardProps) {
  const [copied, setCopied] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(reminder.messageTemplate)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback nếu browser chặn clipboard
      setCopied(false)
    }
  }

  const handleAction = async (
    action: "ACKNOWLEDGED" | "SNOOZED" | "DISMISSED",
    snoozeMinutes?: number
  ) => {
    setIsSubmitting(true)
    try {
      await onAcknowledge(reminder.orderId, reminder.milestone, action, snoozeMinutes)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isCritical = reminder.urgency === "CRITICAL"
  const isWarning = reminder.urgency === "WARNING"

  return (
    <div
      className={`rounded-xl border p-4 transition-all bg-surface ${
        isCritical
          ? "border-danger/40 bg-danger-bg/20 shadow-sm"
          : isWarning
          ? "border-warning/40 bg-warning-bg/10"
          : "border-border"
      }`}
    >
      {/* ── Header: Milestone Badge & Mã Đơn & Trạng Thái ──────────────── */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`px-2 py-0.5 rounded-full text-caption font-extrabold border ${
              MILESTONE_BADGE_STYLE[reminder.milestone]
            }`}
          >
            {reminder.title}
          </span>
          <Button variant="ghost"
            type="button"
            onClick={() => onViewOrder?.(reminder.orderId)}
            className="h-auto p-0 gap-0 text-body-sm font-bold text-text hover:text-primary transition-colors cursor-pointer"
          >
            Đơn #{reminder.orderCode}
          </Button>
        </div>

        {/* Trạng thái quá hạn / sắp đến */}
        <div className="flex items-center gap-1.5 shrink-0">
          {reminder.isOverdue ? (
            <Badge
              tone={isCritical ? "danger" : "warning"}
              className="text-caption gap-1 px-2 py-0.5 font-bold border border-current/20"
            >
              {isCritical ? <AlertOctagon size={12} /> : <AlertTriangle size={12} />}
              <span>Quá {reminder.overdueMinutes} phút</span>
            </Badge>
          ) : (
            <Badge
              tone="neutral"
              className="text-caption gap-1 px-2 py-0.5 text-text-muted border border-border"
            >
              <Clock size={12} />
              <span>Đến giờ nhắc</span>
            </Badge>
          )}
        </div>
      </div>

      {/* ── Gợi ý hành động nghiệp vụ ─────────────────────────────────── */}
      <p className="text-body-sm text-text font-medium mb-3">
        👉 {reminder.suggestedAction}
      </p>

      {/* ── Khung tin nhắn soạn sẵn (Message Template) ────────────────── */}
      <div className="rounded-lg bg-surface border border-border p-3 mb-3 relative group">
        <div className="flex items-center justify-between mb-1">
          <span className="text-caption font-bold text-text-muted">
            {reminder.recipientType === "WORKSHOP"
              ? "Tin nhắn gửi Xưởng / Thợ chế tác"
              : reminder.recipientType === "SHIPPER"
              ? `Tin nhắn gửi Shipper ${
                  reminder.recipientTarget ? `(${reminder.recipientTarget})` : ""
                }`
              : "Tin nhắn gửi Khách hàng"}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyMessage}
            className="h-7 px-2 text-caption gap-1 border-border hover:bg-surface"
          >
            {copied ? (
              <>
                <Check size={12} className="text-success" />
                <span className="text-success font-bold">Đã sao chép</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Sao chép tin nhắn</span>
              </>
            )}
          </Button>
        </div>
        <p className="text-body-sm text-text-muted leading-relaxed font-mono select-all">
          {reminder.messageTemplate}
        </p>
      </div>

      {/* ── Action Buttons: Đã hoàn tất · Hẹn lại · Bỏ qua ─────────────── */}
      <div className="flex items-center justify-end gap-2 pt-1 border-t border-border">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isSubmitting}
          onClick={() => handleAction("DISMISSED")}
          className="h-8 text-caption text-text-muted hover:text-danger gap-1 border-border"
        >
          <XCircle size={13} />
          <span>Bỏ qua</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isSubmitting}
          onClick={() => handleAction("SNOOZED", 10)}
          className="h-8 text-caption gap-1 border-border"
        >
          <CalendarClock size={13} />
          <span>Hẹn lại 10 phút</span>
        </Button>

        <Button
          type="button"
          size="sm"
          disabled={isSubmitting}
          onClick={() => handleAction("ACKNOWLEDGED")}
          className="h-8 text-caption font-bold bg-primary hover:bg-primary-dark text-white gap-1"
        >
          <CheckCircle2 size={13} />
          <span>Đã hoàn tất</span>
        </Button>
      </div>
    </div>
  )
}
