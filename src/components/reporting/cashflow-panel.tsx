"use client"

import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { formatCurrency, formatDateTime } from "@/lib/i18n/formatters"
import { bucketLabel, useReport, type PeriodState } from "./report-fetch"

interface CashflowReport {
  byMethod: Array<{ method: string; label: string; collectedVnd: number; refundedVnd: number; netVnd: number }>
  daily: Array<{ date: string; ledgerTransferVnd: number; bankMatchedVnd: number; bankUnmatchedVnd: number; unmatchedCount: number; differenceVnd: number }>
  unmatched: Array<{ id: string; at: string; amountVnd: number; content: string }>
}

/** Dòng tiền (checklist ALG 6.6): theo hình thức thu; đối chiếu sổ thu chuyển khoản với giao dịch ngân hàng theo ngày. */
export function CashflowPanel({ period }: { period: PeriodState }) {
  const { data, error, loading } = useReport<CashflowReport>("cashflow", period)
  if (error) return <InlineError message={error} />
  if (loading || !data) return <SkeletonBlock lines={4} label="Đang tải báo cáo dòng tiền" />
  const days = data.daily.filter((d) => d.ledgerTransferVnd || d.bankMatchedVnd || d.bankUnmatchedVnd)
  return (
    <div className="space-y-4">
      <table className="w-full text-left text-caption">
        <caption className="mb-1 text-left text-body-sm font-bold text-text">Theo hình thức thu</caption>
        <thead className="text-text-muted"><tr><th scope="col" className="py-1.5">Hình thức</th><th scope="col" className="text-right">Đã thu</th><th scope="col" className="text-right">Hoàn</th><th scope="col" className="text-right">Thực thu</th></tr></thead>
        <tbody className="divide-y divide-border text-text">
          {data.byMethod.map((m) => <tr key={m.method}><th scope="row" className="py-1.5 font-normal">{m.label}</th><td className="text-right">{formatCurrency(m.collectedVnd)}</td><td className="text-right">{formatCurrency(m.refundedVnd)}</td><td className="text-right font-semibold">{formatCurrency(m.netVnd)}</td></tr>)}
          {data.byMethod.length === 0 && <tr><td colSpan={4} className="py-1.5 text-text-muted">Chưa có khoản thu trong kỳ.</td></tr>}
        </tbody>
      </table>
      <table className="w-full text-left text-caption">
        <caption className="mb-1 text-left text-body-sm font-bold text-text">Đối chiếu chuyển khoản với ngân hàng</caption>
        <thead className="text-text-muted"><tr><th scope="col" className="py-1.5">Ngày</th><th scope="col" className="text-right">Sổ thu</th><th scope="col" className="text-right">Ngân hàng đã khớp</th><th scope="col" className="text-right">Chưa khớp</th><th scope="col" className="text-right">Lệch</th></tr></thead>
        <tbody className="divide-y divide-border text-text">
          {days.map((d) => (
            <tr key={d.date}>
              <th scope="row" className="py-1.5 font-normal">{bucketLabel(d.date)}</th>
              <td className="text-right">{formatCurrency(d.ledgerTransferVnd)}</td><td className="text-right">{formatCurrency(d.bankMatchedVnd)}</td>
              <td className="text-right">{d.unmatchedCount > 0 ? `${d.unmatchedCount} · ${formatCurrency(d.bankUnmatchedVnd)}` : "—"}</td>
              <td className={`text-right font-semibold ${d.differenceVnd !== 0 ? "text-danger-text" : "text-success-text"}`}>{formatCurrency(d.differenceVnd)}</td>
            </tr>
          ))}
          {days.length === 0 && <tr><td colSpan={5} className="py-1.5 text-text-muted">Chưa có giao dịch chuyển khoản trong kỳ.</td></tr>}
        </tbody>
      </table>
      {data.unmatched.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning-bg p-3">
          <p className="mb-1 text-body-sm font-bold text-warning-text">Giao dịch ngân hàng chưa khớp đơn</p>
          <ul className="divide-y divide-border text-caption text-text">
            {data.unmatched.map((u) => <li key={u.id} className="flex flex-wrap justify-between gap-2 py-1.5"><span>{formatDateTime(u.at)} · {u.content}</span><span className="font-semibold">{formatCurrency(u.amountVnd)}</span></li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
