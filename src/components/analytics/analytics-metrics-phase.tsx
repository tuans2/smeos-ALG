"use client"

import React from "react"
import { BarChart3 } from "@/components/ui/icon-set/bar-chart3"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { StatTile } from "@/components/ui/stat-tile"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { BusinessPerformanceCard } from "@/components/dashboard/business-performance-card"
import { BUSINESS_RANGES } from "@/modules/reporting/domain/business-summary"
import { metricLabel, type UsageSummary } from "./analytics-types"

export interface AnalyticsMetricsPhaseProps {
  usage: UsageSummary | null
  usageLoading: boolean
  shopName: string
  selectedRange: string
  onSelectRange: (range: string) => void
  canExplain: boolean
  onNextPhase: () => void
}

export function AnalyticsMetricsPhase({
  usage,
  usageLoading,
  shopName,
  selectedRange,
  onSelectRange,
  canExplain,
  onNextPhase,
}: AnalyticsMetricsPhaseProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-title-sm font-bold text-text">Bảng chỉ số đo lường</h2>
          <p className="text-caption text-text-muted">Chọn khoảng thời gian theo dõi hiệu quả</p>
        </div>

        <div className="flex items-center gap-1.5 bg-surface p-1 rounded-xl border border-border">
          {BUSINESS_RANGES.map((r) => (
            <Button
              key={r}
              type="button"
              size="sm"
              variant={r === selectedRange ? "secondary" : "ghost"}
              className="text-caption font-semibold"
              onClick={() => onSelectRange(r)}
            >
              {r}
            </Button>
          ))}
        </div>
      </div>

      {/* Báo cáo Hiệu năng Kinh doanh & Doanh số */}
      <BusinessPerformanceCard
        range={selectedRange}
        aiCreditUsed={usage?.credit_used ?? 0}
        shopName={shopName}
      />

      {/* Khối thẻ số đo thực tế */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {usageLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4 bg-surface border border-border">
              <SkeletonBlock lines={2} label="Đang tải chỉ số đo lường..." />
            </Card>
          ))
        ) : usage && usage.by_feature.length > 0 ? (
          usage.by_feature.map((f) => (
            <StatTile
              key={f.feature}
              label={metricLabel(f.feature)}
              value={f.quantity.toLocaleString("vi-VN")}
              tip={`Mỗi lần dùng tốn ${f.cost_credit} credit.`}
            />
          ))
        ) : (
          <Card className="p-4 col-span-full text-center bg-surface border border-border">
            <div className="text-caption text-text-muted">Chưa có dữ liệu chỉ số cho khoảng thời gian này</div>
          </Card>
        )}
      </div>

      {/* Bảng số liệu chi tiết cho trình đọc màn hình */}
      {usage && usage.by_feature.length > 0 && (
        <Card className="p-4 bg-surface border border-border flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-body-sm font-bold text-text">
              Bảng số liệu chi tiết theo tính năng
            </h3>
            <span className="text-caption text-text-muted">Đo lường thật từ backend</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-caption border-collapse">
              <caption className="sr-only">Bảng chi tiết số đo mức sử dụng theo từng tính năng</caption>
              <thead>
                <tr className="border-b border-border text-text-muted">
                  <th scope="col" className="pb-2 font-semibold">Tính năng</th>
                  <th scope="col" className="pb-2 font-semibold text-right">Số lượt đo</th>
                  <th scope="col" className="pb-2 font-semibold text-right">Hạn mức credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {usage.by_feature.map((f) => (
                  <tr key={f.feature} className="hover:bg-surface-alt/40 transition-colors">
                    <th scope="row" className="py-2.5 font-medium text-text">
                      {metricLabel(f.feature)}
                    </th>
                    <td className="py-2.5 text-right font-bold text-text">
                      {f.quantity.toLocaleString("vi-VN")}
                    </td>
                    <td className="py-2.5 text-right text-text-muted">
                      {f.cost_credit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Mức dùng tổng quan */}
      {usage && (
        <Card className="p-4 bg-surface border border-border flex items-center justify-between">
          <div>
            <div className="text-body-sm font-bold text-text-muted">Tổng mức sử dụng</div>
            <div className="text-title font-black text-text mt-0.5">
              {usage.credit_used} credit
            </div>
          </div>
          <div className="text-right">
            <span className="text-caption text-text-muted block">Hạn mức còn lại</span>
            <span className="text-body-sm font-extrabold text-primary">
              {usage.credit_balance} credit
            </span>
          </div>
        </Card>
      )}

      <div className="border-t border-border pt-4 flex items-center justify-end">
        {canExplain && (
          <Button className="gap-2 shadow-xs" onClick={onNextPhase}>
            <BarChart3 size={15} /> Diễn giải chỉ số bất thường
          </Button>
        )}
      </div>
    </div>
  )
}
