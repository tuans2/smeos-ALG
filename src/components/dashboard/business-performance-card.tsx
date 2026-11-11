"use client"

import React, { useState } from "react"
import { TrendingUp } from "@/components/ui/icon-set/trending-up"
import { Download } from "@/components/ui/icon-set/download"
import { Printer } from "@/components/ui/icon-set/printer"
import { ShoppingBag } from "@/components/ui/icon-set/shopping-bag"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { DollarSign } from "@/components/ui/icon-set/dollar-sign"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Award } from "@/components/ui/icon-set/award"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { useReport } from "@/components/reporting/report-fetch"
import {
  businessSummaryCsv,
  rangePeriod,
  summarizeBusiness,
  type OrderReportTotals,
  type ProductReportRow,
  type RevenueReportTotals,
} from "@/modules/reporting/domain/business-summary"
import { useSession } from "@/lib/session"
import { getIndustryTerminology } from "@/modules/organization/domain/industry-profile"
import { formatCurrency } from "@/lib/i18n/formatters"

export interface BusinessPerformanceCardProps {
  /** Nút chọn nhanh của trang: "Tuần này" | "Tháng này" | "Quý này" */
  range: string
  aiCreditUsed?: number | undefined
  shopName: string
}

/**
 * Hiệu năng kinh doanh (audit BL-12, PO 07/11/2026 Q4): số liệu từ báo cáo theo kỳ phía máy chủ — đủ mọi đơn
 * trong kỳ, không chỉ 100 đơn đầu. Hiện cả "Giá trị đơn" (chính) và "Đã thu thực tế".
 */
export function BusinessPerformanceCard(props: BusinessPerformanceCardProps) {
  const { can } = useSession()
  if (!can("R20")) {
    return (
      <Card className="p-5 border-border bg-surface shadow-xs">
        <EmptyState kind="forbidden" title="Bạn chưa có quyền xem số liệu doanh thu" reason="Điều hành cấp quyền xem báo cáo trong mục Thành viên." />
      </Card>
    )
  }
  return <BusinessPerformanceBody {...props} />
}

function Kpi({ icon, label, value, note, tone = "text-text" }: { icon: React.ReactNode; label: string; value: string; note: string; tone?: string }) {
  return (
    <div className="p-3 rounded-xl border border-border bg-surface-alt">
      <div className="flex items-center gap-1.5 text-caption text-text-muted">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`text-body-sm sm:text-title-sm font-black mt-1 truncate ${tone}`}>{value}</div>
      <div className="text-caption text-text-muted mt-0.5">{note}</div>
    </div>
  )
}

function BusinessPerformanceBody({ range, aiCreditUsed = 0, shopName }: BusinessPerformanceCardProps) {
  const [downloading, setDownloading] = useState(false)
  const { organization } = useSession()
  const ti = getIndustryTerminology(organization?.industry)
  const period = { ...rangePeriod(range), granularity: "day" as const }

  const orders = useReport<{ totals: OrderReportTotals }>("orders", period)
  const revenue = useReport<{ totals: RevenueReportTotals }>("revenue", period)
  const products = useReport<{ byValue: ProductReportRow[] }>("products", period)
  const loading = orders.loading || revenue.loading || products.loading
  const error = orders.error ?? revenue.error ?? products.error
  const report =
    orders.data && revenue.data && products.data
      ? summarizeBusiness(orders.data.totals, revenue.data.totals, products.data.byValue, aiCreditUsed)
      : null

  function handleExportCsv() {
    if (!report) return
    setDownloading(true)
    try {
      const csvContent = businessSummaryCsv(report, shopName, period)
      const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `bao-cao-kinh-doanh_${period.from}_${period.to}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Card className="p-5 space-y-5 border-border bg-surface shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <TrendingUp size={18} />
          </div>
          <div>
            <h2 className="text-title-sm font-extrabold text-text">Hiệu Năng Kinh Doanh &amp; Doanh Số Cửa Hàng</h2>
            <p className="text-caption text-text-muted">Mọi đơn tạo trong kỳ, từ {period.from} đến {period.to}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => window.print()} className="h-8 text-caption gap-1.5">
            <Printer size={13} />
            In nhanh
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={downloading || !report}
            className="h-8 text-caption gap-1.5 font-semibold text-primary border-primary/40 hover:bg-primary/5"
          >
            <Download size={13} />
            {downloading ? "Đang xuất..." : "Xuất CSV"}
          </Button>
        </div>
      </div>

      {error ? (
        <EmptyState kind="error" reason={error} />
      ) : loading || !report ? (
        <SkeletonBlock lines={4} label="Đang tải số liệu kinh doanh..." />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi
              icon={<DollarSign size={13} className="text-success shrink-0" />}
              label="Giá trị đơn"
              value={formatCurrency(report.orderValueVnd)}
              note={`Trung bình ${formatCurrency(report.averageOrderValueVnd)} một đơn`}
            />
            <Kpi
              icon={<DollarSign size={13} className="text-primary shrink-0" />}
              label="Đã thu thực tế"
              value={formatCurrency(report.collectedVnd)}
              note={report.collectionRatePercent === null ? "Đã trừ tiền hoàn" : `Bằng ${report.collectionRatePercent}% giá trị đơn, đã trừ tiền hoàn`}
              tone="text-primary"
            />
            <Kpi
              icon={<CheckCircle2 size={13} className="text-primary shrink-0" />}
              label="Tỷ lệ hoàn tất"
              value={report.completionRatePercent === null ? "—" : `${report.completionRatePercent}%`}
              note={`${report.completedOrders} đã giao · ${report.cancelledOrders} huỷ · ${report.totalOrders} đơn`}
            />
            <Kpi
              icon={<ShoppingBag size={13} className="text-info shrink-0" />}
              label="Đơn đang xử lý"
              value={String(report.openOrders)}
              note={report.overdueOpenOrders > 0 ? `${report.overdueOpenOrders} đơn đã quá hẹn giao` : "Không có đơn quá hẹn giao"}
            />
          </div>

          <div className="flex items-center gap-2 text-caption text-text-muted">
            <Sparkles size={13} className="text-warning-text shrink-0" />
            <span>Credit AI đã dùng: <strong className="text-text">{report.aiCreditUsed}</strong> (sinh ảnh, video &amp; trợ lý)</span>
          </div>

          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-body-sm font-bold text-text">
                <Award size={15} className="text-primary" />
                <span>{ti.sampleProduct} &amp; sản phẩm bán chạy</span>
              </div>
              <span className="text-caption text-text-muted">Theo giá trị bán, đơn chưa huỷ</span>
            </div>

            {report.topProducts.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-border text-center text-caption text-text-muted">
                Chưa có đơn nào trong kỳ để xếp hạng {ti.sampleProduct} bán chạy
              </div>
            ) : (
              <div className="space-y-2">
                {report.topProducts.map((item, idx) => (
                  <div
                    key={item.productId ?? item.name}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border/70 bg-surface-raised transition hover:border-primary/40"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-caption font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="text-body-sm font-bold text-text truncate max-w-xs sm:max-w-md">{item.name}</div>
                        <div className="text-caption text-text-muted">Đã bán {item.quantity}</div>
                      </div>
                    </div>
                    <span className="shrink-0 font-extrabold text-caption sm:text-body-sm text-text">{formatCurrency(item.valueVnd)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  )
}
