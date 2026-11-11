"use client"

import React from "react"
import { formatMinutes } from "@/modules/greeting-card/domain/step-sla"
import type { SlaInfo, TrackingViewItem } from "@/modules/greeting-card/domain/tracking-views"

export const vnd = (n: number) => (n > 0 ? `${n.toLocaleString("vi-VN")} đ` : "Chờ báo giá")
export const codeOf = (i: TrackingViewItem) => (i.orderCode ? `Đơn ${i.orderCode}` : `Link ${i.sendCode}`)

import { formatStaffCode, StaffNametag, StaffNametagGroup, isCoordinationStage } from "@/components/greeting-card/staff-nametag"
export { StaffNametag, StaffNametagGroup, formatStaffCode, isCoordinationStage }

/** Mã nhân viên / Người phụ trách đơn hàng (Spec #7) */
export const responsibleEmployee = (i: TrackingViewItem) => {
  if (i.saleId) {
    return `${i.saleName} (${formatStaffCode(i.saleId)})`
  }
  return i.saleName
}

import { Clock, AlertCircle, CheckCircle2 } from "@/components/ui/icons"

const SLA_STYLE: Record<SlaInfo["state"], { label: string; cls: string }> = {
  OVERDUE: { label: "Quá hạn", cls: "bg-danger-bg text-danger font-bold" },
  DUE_SOON: { label: "Sắp quá hạn", cls: "bg-warning-bg text-warning-text font-bold" },
  ON_TRACK: { label: "Đúng tiến độ", cls: "bg-success-bg text-success font-medium" },
  NONE: { label: "Đã ở bước này", cls: "bg-surface-muted text-text-muted font-medium" },
}

/** Nhãn thời gian chuẩn: trạng thái + đã ở bước bao lâu / chuẩn bao lâu. */
export function SlaBadge({ item, compact = false }: { item: TrackingViewItem; compact?: boolean }) {
  if (item.sla.state === "NONE") {
    const age = formatMinutes(item.sla.ageMinutes)
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-surface-muted px-2 py-0.5 text-caption font-medium text-text-muted">
        <Clock size={11} className="shrink-0" aria-hidden="true" />
        <span>{compact ? age : `Đã ở bước này ${age}`}</span>
      </span>
    )
  }

  const s = SLA_STYLE[item.sla.state]
  const detail = item.sla.state === "OVERDUE" && item.stuck
    ? `quá ${formatMinutes(item.stuck.overdueMinutes)}`
    : item.sla.minutes !== null ? `${formatMinutes(item.sla.ageMinutes)} / ${formatMinutes(item.sla.minutes)}` : formatMinutes(item.sla.ageMinutes)
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-caption ${s.cls}`}>
      {item.sla.state === "OVERDUE" ? (
        <AlertCircle size={11} className="shrink-0" aria-hidden="true" />
      ) : item.sla.state === "DUE_SOON" ? (
        <Clock size={11} className="shrink-0" aria-hidden="true" />
      ) : (
        <CheckCircle2 size={11} className="shrink-0" aria-hidden="true" />
      )}
      <span>{s.label}{compact ? "" : ` · ${detail}`}</span>
    </span>
  )
}

export function ViewState({ loading, error, empty, children }: { loading: boolean; error: unknown; empty: boolean; children: React.ReactNode }) {
  if (error) return <p role="alert" className="rounded-xl bg-danger-bg p-4 text-body-sm text-danger">{(error as Error).message}</p>
  if (loading) return <div className="flex flex-col gap-3" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse motion-reduce:animate-none rounded-xl bg-surface-muted" />)}</div>
  if (empty) return <p className="rounded-2xl border border-border bg-surface p-8 text-center text-body-sm text-text-muted">Không có đơn hoặc link nào khớp bộ lọc.</p>
  return <>{children}</>
}
