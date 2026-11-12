"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/ui/page-header"
import { useSession } from "@/lib/session"
import { OrdersPanel, RevenuePanel } from "@/components/reporting/order-revenue-panels"
import { PerformancePanel, ProductsPanel } from "@/components/reporting/product-performance-panels"
import { CashflowPanel } from "@/components/reporting/cashflow-panel"
import { PartnerPayoutPanel } from "@/components/reporting/partner-payout-panel"
import type { PeriodState } from "@/components/reporting/report-fetch"

const TABS = [
  { id: "orders", label: "Đơn hàng" }, { id: "revenue", label: "Doanh thu" }, { id: "products", label: "Sản phẩm" },
  { id: "performance", label: "Hiệu suất" }, { id: "cashflow", label: "Dòng tiền" }, { id: "partners", label: "Tiền công đối tác" },
] as const
/** Tab cần thêm mã riêng ngoài R20 — bảng kê tiền công đối tác cần R19 (audit BL-22). */
const TAB_CAPABILITY: Partial<Record<(typeof TABS)[number]["id"], string>> = { partners: "R19" }
type Tab = (typeof TABS)[number]["id"]
const GRANULARITY = [{ id: "day", label: "Ngày" }, { id: "week", label: "Tuần" }, { id: "month", label: "Tháng" }] as const

const vnToday = () => new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10)
const daysBefore = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10)

/**
 * Báo cáo theo kỳ (Đợt 5 — checklist ALG 6.1, 6.2, 6.3, 6.5, 6.6): chọn khoảng ngày và cách nhóm; mỗi tab một
 * báo cáo, số liệu tính phía máy chủ theo phạm vi chi nhánh của người xem. Cần quyền xem báo cáo (Điều hành, Kế toán).
 */
export default function BaoCaoPage() {
  const { can } = useSession()
  const [tab, setTab] = useState<Tab>("orders")
  const [draft, setDraft] = useState<PeriodState>(() => ({ from: daysBefore(vnToday(), 29), to: vnToday(), granularity: "day" }))
  const [period, setPeriod] = useState<PeriodState>(draft)

  if (!can("R20")) {
    return <EmptyState title="Bạn chưa có quyền xem báo cáo" reason="Điều hành cấp quyền xem báo cáo trong mục Thành viên." />
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
      <PageHeader title="Báo cáo theo kỳ" description="Đơn hàng, doanh thu, sản phẩm, hiệu suất, dòng tiền và tiền công đối tác trong khoảng thời gian bạn chọn" />
      <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-border bg-surface p-3">
        <label className="flex flex-col gap-1 text-caption text-text">Từ ngày
          <Input type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} className="h-9" aria-label="Từ ngày" />
        </label>
        <label className="flex flex-col gap-1 text-caption text-text">Đến ngày
          <Input type="date" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} className="h-9" aria-label="Đến ngày" />
        </label>
        <div className="flex gap-1">
          {GRANULARITY.map((g) => (
            <Button key={g.id} type="button" size="sm" variant={draft.granularity === g.id ? "secondary" : "ghost"} onClick={() => setDraft({ ...draft, granularity: g.id })}>{g.label}</Button>
          ))}
        </div>
        <Button type="button" size="sm" onClick={() => setPeriod(draft)} disabled={!draft.from || !draft.to || draft.from > draft.to}>Xem báo cáo</Button>
      </div>
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Loại báo cáo">
        {TABS.filter((t) => !TAB_CAPABILITY[t.id] || can(TAB_CAPABILITY[t.id]!)).map((t) => (
          <Button key={t.id} type="button" size="sm" role="tab" aria-selected={tab === t.id} variant={tab === t.id ? "secondary" : "outline"} onClick={() => setTab(t.id)}>{t.label}</Button>
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-surface p-4" role="tabpanel">
        {tab === "orders" && <OrdersPanel period={period} />}
        {tab === "revenue" && <RevenuePanel period={period} />}
        {tab === "products" && <ProductsPanel period={period} />}
        {tab === "performance" && <PerformancePanel period={period} />}
        {tab === "cashflow" && <CashflowPanel period={period} />}
        {tab === "partners" && can("R19") && <PartnerPayoutPanel period={period} />}
      </div>
    </div>
  )
}
