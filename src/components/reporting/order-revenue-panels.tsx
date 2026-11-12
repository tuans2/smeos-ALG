"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { StatTile } from "@/components/ui/stat-tile"
import { formatCurrency, formatNumber } from "@/lib/i18n/formatters"
import { bucketLabel, pct, useReport, type PeriodState } from "./report-fetch"

interface OrderReport {
  totals: { total: number; completed: number; cancelled: number; delivered: number; late: number; overdueOpen: number; completionRate: number | null; cancelRate: number | null; lateRate: number | null }
  series: Array<{ bucket: string; total: number; completed: number; cancelled: number; late: number }>
}
interface RevenueReport {
  totals: { expectedVnd: number; collectedVnd: number; refundedVnd: number; netCollectedVnd: number; collectionRate: number | null; draftCount: number; draftVnd: number }
  series: Array<{ bucket: string; expectedVnd: number; netCollectedVnd: number }>
  orders?: Array<{ id: string; code: string; status: string; totalVnd: number; paidVnd: number }>
}

/** Đơn hàng theo kỳ (checklist ALG 6.1): số đơn, hoàn tất, huỷ, trễ hẹn, đang trễ. */
export function OrdersPanel({ period }: { period: PeriodState }) {
  const { data, error, loading } = useReport<OrderReport>("orders", period)
  if (error) return <InlineError message={error} />
  if (loading || !data) return <SkeletonBlock lines={4} label="Đang tải báo cáo đơn" />
  const t = data.totals
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatTile label="Tổng đơn" value={formatNumber(t.total)} />
        <StatTile label="Hoàn tất" value={`${formatNumber(t.completed)} · ${pct(t.completionRate)}`} />
        <StatTile label="Huỷ" value={`${formatNumber(t.cancelled)} · ${pct(t.cancelRate)}`} />
        <StatTile label="Giao trễ hẹn" value={`${formatNumber(t.late)} · ${pct(t.lateRate)}`} tip="Trên số đơn đã giao" />
        <StatTile label="Đang trễ" value={formatNumber(t.overdueOpen)} tip="Chưa giao, đã quá giờ hẹn" />
      </div>
      <table className="w-full text-left text-caption">
        <caption className="sr-only">Đơn hàng theo kỳ</caption>
        <thead className="text-text-muted"><tr><th scope="col" className="py-2">Kỳ</th><th scope="col" className="text-right">Đơn</th><th scope="col" className="text-right">Hoàn tất</th><th scope="col" className="text-right">Huỷ</th><th scope="col" className="text-right">Trễ</th></tr></thead>
        <tbody className="divide-y divide-border text-text">
          {data.series.map((r) => (
            <tr key={r.bucket}><th scope="row" className="py-1.5 font-normal">{bucketLabel(r.bucket)}</th><td className="text-right">{r.total}</td><td className="text-right">{r.completed}</td><td className="text-right">{r.cancelled}</td><td className="text-right">{r.late}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Doanh thu dự kiến và thực thu (checklist ALG 6.2); bấm một kỳ để xem danh sách đơn của kỳ đó. */
export function RevenuePanel({ period }: { period: PeriodState }) {
  const { data, error, loading } = useReport<RevenueReport>("revenue", period)
  const [drill, setDrill] = useState<PeriodState | null>(null)
  const detail = useReport<RevenueReport>("revenue", drill ?? period, "&detail=orders")
  if (error) return <InlineError message={error} />
  if (loading || !data) return <SkeletonBlock lines={4} label="Đang tải báo cáo doanh thu" />
  const t = data.totals
  const rangeOf = (b: string): PeriodState => {
    if (b.length === 7) {
      const [y, m] = b.split("-").map(Number) as [number, number]
      const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
      return { from: `${b}-01`, to: `${b}-${String(last).padStart(2, "0")}`, granularity: "day" }
    }
    const end = period.granularity === "week" ? new Date(Date.parse(`${b}T00:00:00Z`) + 6 * 86_400_000).toISOString().slice(0, 10) : b
    return { from: b, to: end, granularity: "day" }
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Dự kiến"
          value={formatCurrency(t.expectedVnd)}
          tip={t.draftCount > 0 ? `Đơn đã chốt tạo trong kỳ; chưa tính ${t.draftCount} đơn chờ chốt (${formatCurrency(t.draftVnd)})` : "Tổng giá trị đơn đã chốt tạo trong kỳ"}
        />
        <StatTile label="Thực thu" value={formatCurrency(t.netCollectedVnd)} tip="Khoản thu đã xác nhận trong kỳ, trừ hoàn tiền" />
        <StatTile label="Đã hoàn" value={formatCurrency(t.refundedVnd)} />
        <StatTile label="Tỷ lệ thu" value={pct(t.collectionRate)} />
      </div>
      <table className="w-full text-left text-caption">
        <caption className="sr-only">Doanh thu theo kỳ — bấm để xem đơn</caption>
        <thead className="text-text-muted"><tr><th scope="col" className="py-2">Kỳ</th><th scope="col" className="text-right">Dự kiến</th><th scope="col" className="text-right">Thực thu</th></tr></thead>
        <tbody className="divide-y divide-border text-text">
          {data.series.map((r) => (
            <tr key={r.bucket} className="hover:bg-surface-alt">
              <th scope="row" className="py-1 font-normal">
                <Button type="button" size="sm" variant="ghost" onClick={() => setDrill(rangeOf(r.bucket))} aria-label={`Xem đơn kỳ ${bucketLabel(r.bucket)}`}>{bucketLabel(r.bucket)}</Button>
              </th>
              <td className="text-right">{formatCurrency(r.expectedVnd)}</td><td className="text-right">{formatCurrency(r.netCollectedVnd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {drill && (
        <div className="rounded-xl border border-border p-3">
          <p className="mb-2 text-caption font-semibold text-text">Đơn tạo từ {drill.from} đến {drill.to}</p>
          {detail.loading ? <SkeletonBlock lines={3} label="Đang tải danh sách đơn" /> : (
            <ul className="divide-y divide-border text-caption">
              {(detail.data?.orders ?? []).map((o) => (
                <li key={o.id} className="flex justify-between py-1.5">
                  <span className="font-mono font-semibold text-text">{o.code}</span>
                  <span className="text-text">{formatCurrency(o.totalVnd)} · đã thu {formatCurrency(o.paidVnd)}</span>
                </li>
              ))}
              {(detail.data?.orders ?? []).length === 0 && <li className="py-1.5 text-text-muted">Không có đơn.</li>}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
