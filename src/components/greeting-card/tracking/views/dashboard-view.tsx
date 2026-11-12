"use client"

import React from "react"
import { useApi } from "@/components/greeting-card/greeting-api"
import type { TrackingDashboard } from "@/modules/greeting-card/domain/tracking-views"
import { ShareLinksSummary } from "../share-links-summary"
import { SalesFunnelStats } from "../../sales/sales-funnel-stats"
import { ChannelFunnelStats } from "../../sales/channel-funnel-stats"
import { ViewState, vnd } from "./tracking-bits"

import { STEP_OWNER_LABEL as OWNER_LABEL } from "@/modules/greeting-card/domain/step-sla"

function Stat({ label, value, tone = "" }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3">
      <p className="text-caption text-text-muted">{label}</p>
      <p className={`text-title font-extrabold ${tone || "text-text"}`}>{value}</p>
    </div>
  )
}

/** Dashboard: số liệu tổng hợp tính ở máy chủ trên đúng bộ lọc và phạm vi đang xem. */
export function DashboardView({ qs }: { qs: string }) {
  const res = useApi<{ data: TrackingDashboard }>(`/api/v1/greeting-card/tracking?view=dashboard&${qs}`, { refreshInterval: 30_000 })
  const d = res.data?.data
  const max = Math.max(1, ...(d?.byStep.map((s) => s.count) ?? [1]))
  return (
    <ViewState loading={res.isLoading} error={res.error} empty={false}>
      {d && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Đang theo dõi" value={`${d.orders} đơn · ${d.links} link`} />
            <Stat label="Quá thời gian chuẩn" value={d.overdue} tone={d.overdue > 0 ? "text-danger" : ""} />
            <Stat label="Sắp quá hạn" value={d.dueSoon} tone={d.dueSoon > 0 ? "text-warning-text" : ""} />
            <Stat label="Còn phải thu" value={vnd(d.outstandingVnd)} />
          </div>
          <p className="text-body-sm text-text-muted">Đã thu tiền trở đi: {d.progress.paidOrBeyondRate}% đơn · Hoàn tất: {d.progress.completedRate}% đơn</p>
          <section aria-label="Theo bước" className="rounded-2xl border border-border bg-surface p-3">
            <h3 className="mb-2 text-body-sm font-extrabold text-text">Theo bước</h3>
            <ul className="flex flex-col gap-1.5">
              {d.byStep.map((s) => (
                <li key={s.stepId} className="grid grid-cols-[8rem_1fr_auto] items-center gap-2 text-caption">
                  <span className="truncate text-text">{s.title}</span>
                  <span className="h-2 rounded-full bg-surface-alt"><span className="block h-2 rounded-full bg-primary" style={{ width: `${(s.count / max) * 100}%` }} /></span>
                  <span className="text-text-muted">{s.count}{s.overdue > 0 && <span className="text-danger"> · {s.overdue} quá hạn</span>}</span>
                </li>
              ))}
            </ul>
          </section>
          <div className="grid gap-3 sm:grid-cols-2">
            <section aria-label="Thời gian ở bước" className="rounded-2xl border border-border bg-surface p-3">
              <h3 className="mb-2 text-body-sm font-extrabold text-text">Đã ở bước hiện tại</h3>
              {d.aging.map((a) => <p key={a.id} className="flex justify-between text-body-sm"><span>{a.label}</span><strong>{a.count}</strong></p>)}
            </section>
            <section aria-label="Theo người phụ trách" className="rounded-2xl border border-border bg-surface p-3">
              <h3 className="mb-2 text-body-sm font-extrabold text-text">Việc trễ theo người phụ trách</h3>
              {d.byOwner.map((o) => (
                <p key={o.owner} className="flex justify-between text-body-sm">
                  <span>{OWNER_LABEL[o.owner]}</span><span><strong className="text-danger">{o.overdue}</strong> quá hạn · {o.dueSoon} sắp hạn</span>
                </p>
              ))}
            </section>
          </div>
          <ShareLinksSummary />
          {/* Phễu chuyển đổi theo nhân viên bán và theo kênh, bộ sưu tập (checklist ALG 6.4) */}
          <SalesFunnelStats />
          <ChannelFunnelStats />
        </div>
      )}
    </ViewState>
  )
}
