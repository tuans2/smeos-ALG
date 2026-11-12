"use client"

import React, { useState } from "react"
import { Clock } from "@/components/ui/icon-set/clock"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { AlertOctagon } from "@/components/ui/icon-set/alert-octagon"
import { CheckCircle } from "@/components/ui/icon-set/check-circle"
import { TrendingUp } from "@/components/ui/icon-set/trending-up"
import { ArrowRight } from "@/components/ui/icon-set/arrow-right"
import { ShieldAlert } from "@/components/ui/icon-set/shield-alert"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { CoordinatorStage } from "@/modules/coordinator/domain/coordinator-types"
import {
  classifySlaStatus,
  evaluateOrderSla,
  computeSlaSummaryReport,
  type SlaStatus,
} from "@/modules/coordinator/domain/sla-monitor"

export interface SlaMonitorOrder {
  id: string
  orderCode: string
  stage: CoordinatorStage
  stageLabel: string
  recipientName: string
  deliveryTargetTime: string
  timeRemaining: number | null
  partnerName: string | null
}

export interface SlaMonitorPanelProps {
  orders: SlaMonitorOrder[]
  onSelectOrder?: ((orderId: string) => void) | undefined
}

export function SlaMonitorPanel({ orders, onSelectOrder }: SlaMonitorPanelProps) {
  const [filter, setFilter] = useState<"ALL" | SlaStatus>("ALL")

  const summary = computeSlaSummaryReport(orders)

  const filteredOrders = orders.filter((o) => {
    if (filter === "ALL") return true
    const status = classifySlaStatus(o.timeRemaining, o.stage)
    return status === filter
  })

  return (
    <div className="space-y-4">
      {/* ── Khối Chỉ số SLA Tổng quan ─────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3.5 border-border bg-surface">
          <div className="flex items-center gap-2 text-caption text-text-muted">
            <Clock size={14} className="text-primary shrink-0" />
            <span>Đang thực hiện</span>
          </div>
          <div className="mt-1 text-display font-extrabold text-text">
            {summary.totalActiveOrders}
          </div>
          <div className="text-caption text-text-muted mt-0.5">
            Tuân thủ: <strong className="text-text">{summary.overallComplianceRatePercent}%</strong>
          </div>
        </Card>

        <Card className="p-3.5 border-success/30 bg-success-bg/40">
          <div className="flex items-center gap-2 text-caption text-success font-semibold">
            <CheckCircle size={14} className="shrink-0" />
            <span>Đúng tiến độ</span>
          </div>
          <div className="mt-1 text-display font-extrabold text-success">
            {summary.onTrackCount}
          </div>
          <div className="text-caption text-text-muted mt-0.5">
            Không có nguy cơ trễ
          </div>
        </Card>

        <Card className="p-3.5 border-warning/40 bg-warning-bg/40">
          <div className="flex items-center gap-2 text-caption text-warning-text font-semibold">
            <AlertTriangle size={14} className="shrink-0" />
            <span>Sắp trễ (&lt;30p)</span>
          </div>
          <div className="mt-1 text-display font-extrabold text-warning-text">
            {summary.nearBreachCount}
          </div>
          <div className="text-caption text-text-muted mt-0.5">
            Cần theo dõi sát
          </div>
        </Card>

        <Card className="p-3.5 border-danger/40 bg-danger-bg/40">
          <div className="flex items-center gap-2 text-caption text-danger font-semibold">
            <AlertOctagon size={14} className="shrink-0" />
            <span>Quá hạn SLA</span>
          </div>
          <div className="mt-1 text-display font-extrabold text-danger">
            {summary.breachedCount}
          </div>
          <div className="text-caption text-text-muted mt-0.5">
            Cần can thiệp khẩn
          </div>
        </Card>
      </div>

      {/* ── Báo cáo Tuân thủ Đối tác (SC-06) ────────────────────────── */}
      {summary.partnerStats.length > 0 && (
        <Card className="p-4 border-border bg-surface">
          <div className="flex items-center gap-2 font-bold text-body-sm text-text mb-3">
            <TrendingUp size={15} className="text-primary" />
            <span>Tỷ lệ Tuân thủ SLA theo Đối tác Xưởng / Cửa hàng</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {summary.partnerStats.map((p) => (
              <div
                key={p.partnerName}
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 bg-surface"
              >
                <div>
                  <div className="font-semibold text-body-sm text-text">{p.partnerName}</div>
                  <div className="text-caption text-text-muted">
                    {p.totalOrders} đơn · {p.breachedOrders > 0 ? `${p.breachedOrders} đơn trễ` : "100% đúng hẹn"}
                  </div>
                </div>
                <Badge
                  tone={p.complianceRatePercent >= 90 ? "success" : p.complianceRatePercent >= 70 ? "warning" : "danger"}
                >
                  {p.complianceRatePercent}%
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Bộ lọc & Danh sách Cảnh báo Thông minh (SC-01, SC-02, SC-04) ── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-bold text-body-sm text-text">
            <ShieldAlert size={16} className="text-primary" />
            <span>Cảnh Báo Độ Trễ &amp; Đề Xuất Tái Điều Phối Thông Minh</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant={filter === "ALL" ? "primary" : "outline"}
              size="sm"
              onClick={() => setFilter("ALL")}
              className="h-7 text-caption px-2.5"
            >
              Tất cả ({orders.length})
            </Button>
            <Button
              type="button"
              variant={filter === "NEAR_BREACH" ? "primary" : "outline"}
              size="sm"
              onClick={() => setFilter("NEAR_BREACH")}
              className="h-7 text-caption px-2.5 text-warning-text"
            >
              Sắp trễ ({summary.nearBreachCount})
            </Button>
            <Button
              type="button"
              variant={filter === "BREACHED" ? "primary" : "outline"}
              size="sm"
              onClick={() => setFilter("BREACHED")}
              className="h-7 text-caption px-2.5 text-danger"
            >
              Đã trễ ({summary.breachedCount})
            </Button>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-caption text-text-muted border border-dashed border-border rounded-xl">
            Không có đơn hàng nào trong phân nhóm này
          </div>
        ) : (
          <div className="space-y-2">
            {filteredOrders.map((o) => {
              const evaluation = evaluateOrderSla({
                timeRemainingMinutes: o.timeRemaining,
                stage: o.stage,
                hasPartner: Boolean(o.partnerName),
              })

              return (
                <div
                  key={o.id}
                  className={`p-3.5 rounded-xl border-2 ${evaluation.colorToken} transition-shadow hover:shadow-sm`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-body-sm text-text">{o.orderCode}</span>
                        <Badge tone={evaluation.badgeVariant}>
                          {evaluation.label}
                        </Badge>
                        <span className="text-caption text-text-muted">
                          Hẹn: <strong>{o.deliveryTargetTime}</strong>
                        </span>
                      </div>
                      <div className="text-caption text-text-muted">
                        Khách: <strong>{o.recipientName}</strong> · Bước:{" "}
                        <strong className="text-text">{o.stageLabel}</strong> · Xưởng:{" "}
                        <strong>{o.partnerName ?? "Chưa gán"}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-caption font-bold text-text">
                          {o.timeRemaining === null
                            ? "Chưa có giờ"
                            : o.timeRemaining < 0
                            ? `Quá ${Math.abs(o.timeRemaining)} phút`
                            : `Còn ${o.timeRemaining} phút`}
                        </div>
                      </div>

                      {onSelectOrder && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onSelectOrder(o.id)}
                          className="h-7 px-2 text-caption gap-1 font-semibold"
                        >
                          Xử lý
                          <ArrowRight size={12} />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Đề xuất hành động thông minh (SC-02) */}
                  {evaluation.suggestedAction && (
                    <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center gap-2 text-caption font-semibold">
                      <span className="shrink-0 text-primary font-bold">⚡ Đề xuất AI:</span>
                      <span className="text-text">{evaluation.suggestedAction}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
