"use client"

import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { formatCurrency, formatNumber } from "@/lib/i18n/formatters"
import { pct, useReport, type PeriodState } from "./report-fetch"

interface ProductReport {
  byQuantity: Array<{ name: string; quantity: number; valueVnd: number }>
  byValue: Array<{ name: string; quantity: number; valueVnd: number }>
  colors: Array<{ label: string; quantity: number; sharePercent: number | null }>
  styles: Array<{ label: string; quantity: number; sharePercent: number | null }>
}
interface PerformanceReport {
  sales: Array<{ userId: string; name: string; orders: number; revenueVnd: number }>
  florists: Array<{ userId: string; name: string; assigned: number; done: number }>
  shippers: Array<{ key: string; name: string; delivered: number; onTime: number; onTimeRate: number | null }>
}

function Ranked({ title, rows, value }: { title: string; rows: Array<{ name: string; quantity: number; valueVnd: number }>; value: "quantity" | "valueVnd" }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="mb-2 text-body-sm font-bold text-text">{title}</p>
      <ol className="space-y-1 text-caption text-text">
        {rows.slice(0, 10).map((r, i) => (
          <li key={`${r.name}-${i}`} className="flex justify-between gap-2"><span>{i + 1}. {r.name}</span><span className="font-semibold">{value === "quantity" ? formatNumber(r.quantity) : formatCurrency(r.valueVnd)}</span></li>
        ))}
        {rows.length === 0 && <li className="text-text-muted">Chưa có dữ liệu trong kỳ.</li>}
      </ol>
    </div>
  )
}

function Shares({ title, rows }: { title: string; rows: Array<{ label: string; quantity: number; sharePercent: number | null }> }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="mb-2 text-body-sm font-bold text-text">{title}</p>
      <ul className="space-y-1.5 text-caption text-text">
        {rows.slice(0, 8).map((r) => (
          <li key={r.label} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-2">
            <span className="truncate">{r.label}</span>
            <span className="h-2 rounded-full bg-surface-alt" aria-hidden="true"><span className="block h-2 rounded-full bg-primary" style={{ width: `${r.sharePercent ?? 0}%` }} /></span>
            <span className="text-right">{pct(r.sharePercent)}</span>
          </li>
        ))}
        {rows.length === 0 && <li className="text-text-muted">Mẫu chưa ghi thuộc tính này.</li>}
      </ul>
    </div>
  )
}

/** Sản phẩm (checklist ALG 6.3): xếp hạng theo số lượng và giá trị, tỷ trọng màu chủ đạo và phong cách. */
export function ProductsPanel({ period }: { period: PeriodState }) {
  const { data, error, loading } = useReport<ProductReport>("products", period)
  if (error) return <InlineError message={error} />
  if (loading || !data) return <SkeletonBlock lines={4} label="Đang tải báo cáo sản phẩm" />
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <Ranked title="Bán nhiều nhất (số lượng)" rows={data.byQuantity} value="quantity" />
      <Ranked title="Giá trị cao nhất" rows={data.byValue} value="valueVnd" />
      <Shares title="Màu chủ đạo" rows={data.colors} />
      <Shares title="Phong cách" rows={data.styles} />
    </div>
  )
}

/** Hiệu suất (checklist ALG 6.5): doanh số theo Sale, sản lượng theo thợ, giao đúng giờ theo shipper. */
export function PerformancePanel({ period }: { period: PeriodState }) {
  const { data, error, loading } = useReport<PerformanceReport>("performance", period)
  if (error) return <InlineError message={error} />
  if (loading || !data) return <SkeletonBlock lines={4} label="Đang tải báo cáo hiệu suất" />
  const table = (caption: string, head: string[], rows: Array<Array<string>>) => (
    <table className="w-full text-left text-caption">
      <caption className="mb-1 text-left text-body-sm font-bold text-text">{caption}</caption>
      <thead className="text-text-muted"><tr>{head.map((h, i) => <th key={h} scope="col" className={i ? "text-right" : "py-1.5"}>{h}</th>)}</tr></thead>
      <tbody className="divide-y divide-border text-text">
        {rows.map((r, i) => <tr key={i}>{r.map((c, j) => (j ? <td key={j} className="text-right">{c}</td> : <th key={j} scope="row" className="py-1.5 font-normal">{c}</th>))}</tr>)}
        {rows.length === 0 && <tr><td colSpan={head.length} className="py-1.5 text-text-muted">Chưa có dữ liệu trong kỳ.</td></tr>}
      </tbody>
    </table>
  )
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {table("Sale", ["Nhân viên", "Đơn", "Doanh số"], data.sales.map((s) => [s.name, formatNumber(s.orders), formatCurrency(s.revenueVnd)]))}
      {table("Thợ chế tác", ["Thợ", "Được giao", "Đã xong"], data.florists.map((f) => [f.name, formatNumber(f.assigned), formatNumber(f.done)]))}
      {table("Shipper", ["Shipper", "Đã giao", "Đúng giờ"], data.shippers.map((s) => [s.name, formatNumber(s.delivered), pct(s.onTimeRate)]))}
    </div>
  )
}
