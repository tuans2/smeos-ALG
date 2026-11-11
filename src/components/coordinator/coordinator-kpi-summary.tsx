"use client"

import React from "react"
import { Radio } from "@/components/ui/icon-set/radio"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Card } from "@/components/ui/card"
import type { CoordinationOrder } from "./coordinator-api"

export interface CoordinatorKpiSummaryProps {
  orders?: CoordinationOrder[] | undefined
  totalCount?: number | undefined
  criticalCount?: number | undefined
  atRiskCount?: number | undefined
  onTrackCount?: number | undefined
}

export function CoordinatorKpiSummary({
  orders,
  totalCount,
  criticalCount,
  atRiskCount,
  onTrackCount,
}: CoordinatorKpiSummaryProps) {
  const total =
    totalCount ??
    (orders ? orders.filter((o) => o.stage !== "COMPLETED" && o.stage !== "CANCELLED").length : 0)
  const critical =
    criticalCount ?? (orders ? orders.filter((o) => o.riskLevel === "CRITICAL").length : 0)
  const atRisk =
    atRiskCount ?? (orders ? orders.filter((o) => o.riskLevel === "AT_RISK").length : 0)
  const onTrack =
    onTrackCount ??
    (orders
      ? orders.filter(
          (o) => o.riskLevel === "NORMAL" && o.stage !== "COMPLETED" && o.stage !== "CANCELLED"
        ).length
      : 0)

  return (
    <div className="space-y-4">
      {/* Khối Tôn Chỉ Vận Hành Sổ Tay Điều Phối (P10 & P12) */}
      <div className="rounded-2xl border border-primary/20 bg-surface-alt p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-xs">
            <Radio size={20} className="animate-pulse motion-reduce:animate-none" />
          </div>
          <div>
            <div className="text-caption font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <span>SỔ TAY ĐIỀU PHỐI • MANTRA CỐT LÕI</span>
            </div>
            <div className="text-body-sm font-black text-text mt-0.5">
              “Nhận đúng — Hiểu đúng — Chọn đúng — Làm đúng — Kiểm tra đúng — Giao đúng — Đóng đúng”
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap text-caption font-bold text-text-muted bg-surface/80 px-3 py-1.5 rounded-xl border border-border/80">
          <span className="text-primary font-extrabold">5 Câu Hỏi Kiểm Tra:</span>
          <span className="px-1.5 py-0.5 rounded bg-surface text-text-muted">1. Đơn ở đâu?</span>
          <span className="px-1.5 py-0.5 rounded bg-surface text-text-muted">2. Tiếp theo làm gì?</span>
          <span className="px-1.5 py-0.5 rounded bg-surface text-text-muted">3. Ai giữ bóng?</span>
          <span className="px-1.5 py-0.5 rounded bg-surface text-text-muted">4. Có rủi ro gì?</span>
          <span className="px-1.5 py-0.5 rounded bg-surface text-text-muted">5. Khi nào xong?</span>
        </div>
      </div>

      {/* Control Tower Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="rounded-2xl border border-border bg-surface p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-text-muted text-caption font-bold">
            <span>Đang Xử Lý</span>
            <Radio size={16} className="text-primary" />
          </div>
          <div className="text-title-lg font-black text-text mt-2">{total}</div>
        </Card>
        <Card className="rounded-2xl border border-danger/30 bg-danger/5 p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-danger-text text-caption font-bold">
            <span>Nguy Cấp (Critical)</span>
            <AlertCircle size={16} className="text-danger" />
          </div>
          <div className="text-title-lg font-black text-danger mt-2">{critical}</div>
        </Card>
        <Card className="rounded-2xl border border-warning/30 bg-warning/5 p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-warning-text text-caption font-bold">
            <span>Có Rủi Ro (At-Risk)</span>
            <AlertTriangle size={16} className="text-warning-text" />
          </div>
          <div className="text-title-lg font-black text-warning-text mt-2">{atRisk}</div>
        </Card>
        <Card className="rounded-2xl border border-success/30 bg-success/5 p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-success text-caption font-bold">
            <span>Đúng Tiến Độ (On-Track)</span>
            <CheckCircle2 size={16} className="text-success" />
          </div>
          <div className="text-title-lg font-black text-success mt-2">{onTrack}</div>
        </Card>
      </div>
    </div>
  )
}
