"use client"

import { useEffect, useState } from "react"

import { StatTile } from "@/components/ui/stat-tile"
import { formatCurrency } from "@/lib/i18n/formatters"

interface Overview {
  organizations: { total: number; active: number; overdue: number; cancelled: number; withoutSubscription: number }
  subscriptionRevenue: Array<{ period: string; amountVnd: number }>
}

/** Tổng quan Console (checklist ALG 9.8): cửa hàng theo trạng thái thuê bao, doanh thu thuê bao đã thu 6 tháng. */
export function SubscriptionOverviewCard() {
  const [data, setData] = useState<Overview | null>(null)

  useEffect(() => {
    fetch("/api/v1/platform/overview")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { data: Overview } | null) => { if (j) setData(j.data) })
      .catch(() => setData(null))
  }, [])

  if (!data) return null
  const max = Math.max(1, ...data.subscriptionRevenue.map((r) => r.amountVnd))
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Đang thuê bao" value={data.organizations.active} tip="Cửa hàng có gói đang hoạt động" />
        <StatTile label="Quá hạn" value={<span className={data.organizations.overdue > 0 ? "text-danger-text" : "text-text"}>{data.organizations.overdue}</span>} tip="Hoá đơn tới hạn chưa thu — cửa hàng đang chỉ xem" />
        <StatTile label="Chưa gán gói" value={data.organizations.withoutSubscription} tip="Tổ chức chưa có gói thuê bao" />
        <StatTile label="Đã huỷ" value={data.organizations.cancelled} tip="Gói đã huỷ" />
      </div>
      <div className="space-y-2 rounded-2xl border border-border bg-surface p-5 shadow-xs">
        <h3 className="text-title-sm font-bold text-text">Doanh thu thuê bao đã thu</h3>
        <ul className="space-y-1.5">
          {data.subscriptionRevenue.map((r) => (
            <li key={r.period} className="grid grid-cols-[4.5rem_1fr_7rem] items-center gap-2 text-caption text-text">
              <span>{r.period.slice(5)}/{r.period.slice(0, 4)}</span>
              <span className="h-2 rounded-full bg-surface-alt" aria-hidden="true">
                <span className="block h-2 rounded-full bg-primary" style={{ width: `${(r.amountVnd / max) * 100}%` }} />
              </span>
              <span className="text-right font-semibold">{formatCurrency(r.amountVnd)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
