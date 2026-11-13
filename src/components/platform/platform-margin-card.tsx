"use client"

import { useEffect, useState } from "react"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { formatCurrency, formatNumber } from "@/lib/i18n/formatters"

interface Row { organizationId: string; organizationName: string; creditUsed: number; revenueVnd: number; costVnd: number; marginVnd: number; marginPercent: number | null }
interface Report { period: string; rows: Row[]; total: Omit<Row, "organizationId" | "organizationName"> }

const currentPeriod = () => {
  const vn = new Date(Date.now() + 7 * 3_600_000)
  return `${vn.getUTCFullYear()}-${String(vn.getUTCMonth() + 1).padStart(2, "0")}`
}

/** Console → Mức dùng → Biên lợi nhuận theo tháng và tổ chức (checklist ALG 10.4, `N4`). */
export function PlatformMarginCard() {
  const [period, setPeriod] = useState(currentPeriod)
  const [report, setReport] = useState<Report | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!/^\d{4}-\d{2}$/.test(period)) return
    fetch(`/api/v1/platform/margin?period=${period}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { data: Report }) => { setReport(j.data); setFailed(false) })
      .catch(() => setFailed(true))
  }, [period])

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-body-sm font-bold text-text">Biên lợi nhuận</p>
          <p className="text-caption text-text-muted">Credit khách đã dùng quy ra tiền, trừ chi phí AI thật và chi phí tin nhắn.</p>
        </div>
        <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="h-9 w-40" aria-label="Kỳ báo cáo" />
      </div>
      {failed && <p className="text-caption text-danger-text">Chưa tải được báo cáo biên lợi nhuận.</p>}
      {!report && !failed && <SkeletonBlock lines={3} label="Đang tải biên lợi nhuận" />}
      {report && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-caption">
            <thead className="text-text-muted">
              <tr>
                <th scope="col" className="py-2 pr-3">Tổ chức</th>
                <th scope="col" className="py-2 pr-3 text-right">Credit đã dùng</th>
                <th scope="col" className="py-2 pr-3 text-right">Doanh thu</th>
                <th scope="col" className="py-2 pr-3 text-right">Chi phí</th>
                <th scope="col" className="py-2 text-right">Biên</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-text">
              {report.rows.map((r) => (
                <tr key={r.organizationId}>
                  <td className="py-2 pr-3">{r.organizationName}</td>
                  <td className="py-2 pr-3 text-right">{formatNumber(r.creditUsed)}</td>
                  <td className="py-2 pr-3 text-right">{formatCurrency(r.revenueVnd)}</td>
                  <td className="py-2 pr-3 text-right">{formatCurrency(r.costVnd)}</td>
                  <td className={`py-2 text-right font-semibold ${r.marginVnd < 0 ? "text-danger-text" : "text-success-text"}`}>
                    {formatCurrency(r.marginVnd)}{r.marginPercent !== null ? ` (${r.marginPercent}%)` : ""}
                  </td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className="py-2 pr-3">Tổng</td>
                <td className="py-2 pr-3 text-right">{formatNumber(report.total.creditUsed)}</td>
                <td className="py-2 pr-3 text-right">{formatCurrency(report.total.revenueVnd)}</td>
                <td className="py-2 pr-3 text-right">{formatCurrency(report.total.costVnd)}</td>
                <td className="py-2 text-right">{formatCurrency(report.total.marginVnd)}</td>
              </tr>
            </tbody>
          </table>
          {report.rows.length === 0 && <p className="py-3 text-caption text-text-muted">Kỳ này chưa có phát sinh.</p>}
        </div>
      )}
    </Card>
  )
}
