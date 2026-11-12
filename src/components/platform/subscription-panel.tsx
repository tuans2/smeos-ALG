"use client"

import { useCallback, useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { formatCurrency, formatDate } from "@/lib/i18n/formatters"
import { isPlanCode, PLAN_LABEL } from "@/modules/subscription/domain/subscription-rules"

interface Sub {
  plan: string; cycle: "MONTHLY" | "YEARLY"; price_vnd: number; included_credits_monthly: number; status: string; current_period_end: string
  pending_change?: { plan: string; cycle: string; priceVnd: number; effectiveAt: string } | null
}
interface Invoice { id: string; code: string; periodStart: string; periodEnd: string; amountVnd: number; status: string; dueAt: string }

export const PLAN_OPTIONS = [
  { id: "STARTER", label: "Starter" }, { id: "PRO", label: "Pro" }, { id: "FLOWER_NETWORK", label: "Mạng lưới" },
  { id: "ENTERPRISE", label: "Doanh nghiệp" }, { id: "EXPERIENCE", label: "Trải nghiệm" },
] as const
const STATUS: Record<string, { label: string; tone: "success" | "danger" | "neutral" | "warning" }> = {
  ACTIVE: { label: "Đang hoạt động", tone: "success" }, OVERDUE: { label: "Quá hạn — chỉ xem", tone: "danger" },
  CANCELLED: { label: "Đã huỷ", tone: "neutral" }, PENDING: { label: "Chờ thu", tone: "warning" }, PAID: { label: "Đã thu", tone: "success" }, VOID: { label: "Đã huỷ", tone: "neutral" },
}

async function call(url: string, method: string, body?: unknown): Promise<string | null> {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) }).catch(() => null)
  if (res?.ok) return null
  const j = (await res?.json().catch(() => null)) as { error?: { message?: string } } | null
  return j?.error?.message ?? "Không thực hiện được"
}

/** Console → tổ chức → Gói thuê bao (checklist ALG 10.7): gán/đổi gói, giá theo kỳ, hoá đơn, xác nhận thu, huỷ. */
export function SubscriptionPanel({ organizationId }: { organizationId: string }) {
  const [sub, setSub] = useState<Sub | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [form, setForm] = useState({ plan: "PRO", cycle: "MONTHLY" as "MONTHLY" | "YEARLY", price: "", credits: "0", paid: false })
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const base = `/api/v1/platform/organizations/${organizationId}/subscription`

  const load = useCallback(() => {
    fetch(base)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { data: { subscription: Sub | null; invoices: Invoice[] } } | null) => {
        if (!j) return
        setSub(j.data.subscription)
        setInvoices(j.data.invoices)
        const s = j.data.subscription
        if (s) setForm((f) => ({ ...f, plan: s.plan, cycle: s.cycle, price: String(s.price_vnd), credits: String(s.included_credits_monthly) }))
      })
      .catch(() => setMessage("Chưa tải được gói thuê bao"))
  }, [base])

  useEffect(() => { load() }, [load])

  const act = async (fn: () => Promise<string | null>, ok: string) => {
    setBusy(true)
    setMessage(null)
    const err = await fn()
    setBusy(false)
    setMessage(err ?? ok)
    if (!err) load()
  }

  const save = () => act(() => call(base, "PUT", {
    plan: form.plan, cycle: form.cycle, priceVnd: Number(form.price || 0), includedCreditsMonthly: Number(form.credits || 0), firstPeriodPaid: form.paid,
  }), sub ? "Đã cập nhật gói (áp từ hoá đơn kỳ sau)" : "Đã gán gói")

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div>
          <p className="text-body-sm font-bold text-text">Gói thuê bao</p>
          <p className="text-caption text-text-muted">Hết kỳ mà hoá đơn kỳ sau chưa thu thì cửa hàng chuyển sang chỉ xem ngay.</p>
        </div>
        {sub && <Badge tone={STATUS[sub.status]?.tone ?? "neutral"}>{STATUS[sub.status]?.label ?? sub.status}</Badge>}
      </div>
      {sub && <p className="text-caption text-text">Kỳ hiện tại tới {formatDate(sub.current_period_end)}</p>}
      {sub?.pending_change && (
        <p className="text-caption text-text-muted">
          Chờ đổi từ {formatDate(sub.pending_change.effectiveAt)}: gói {isPlanCode(sub.pending_change.plan) ? PLAN_LABEL[sub.pending_change.plan] : sub.pending_change.plan} · {formatCurrency(sub.pending_change.priceVnd)}/{sub.pending_change.cycle === "YEARLY" ? "năm" : "tháng"}
        </p>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
        <NativeSelect value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} aria-label="Gói">
          {PLAN_OPTIONS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </NativeSelect>
        <NativeSelect value={form.cycle} onChange={(e) => setForm({ ...form, cycle: e.target.value as "MONTHLY" | "YEARLY" })} aria-label="Chu kỳ">
          <option value="MONTHLY">Theo tháng</option>
          <option value="YEARLY">Theo năm</option>
        </NativeSelect>
        <Input inputMode="numeric" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value.replace(/\D/g, "") })} placeholder="Giá mỗi kỳ (đ)" className="h-9" aria-label="Giá mỗi kỳ" />
        <Input inputMode="numeric" value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value.replace(/\D/g, "") })} placeholder="Credit tặng/tháng" className="h-9" aria-label="Credit tặng mỗi tháng" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!sub ? (
          <label className="flex items-center gap-2 text-caption text-text">
            <Switch checked={form.paid} onCheckedChange={(v) => setForm({ ...form, paid: v })} aria-label="Đã thu tiền kỳ đầu" /> Đã thu tiền kỳ đầu
          </label>
        ) : <span />}
        <div className="flex gap-2">
          {sub && sub.status !== "CANCELLED" && (
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void act(() => call(base, "DELETE"), "Đã huỷ gói")}>Huỷ gói</Button>
          )}
          <Button type="button" size="sm" variant="secondary" disabled={busy || form.price === ""} onClick={() => void save()}>{sub ? "Lưu gói" : "Gán gói"}</Button>
        </div>
      </div>
      {message && <p role="status" className="text-caption text-text-muted">{message}</p>}
      {invoices.length > 0 && (
        <ul className="divide-y divide-border text-caption">
          {invoices.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-2 py-2">
              <span className="font-mono font-semibold text-text">{i.code}</span>
              <span className="text-text-muted">{formatDate(i.periodStart)} – {formatDate(i.periodEnd)}</span>
              <span className="text-text">{formatCurrency(i.amountVnd)}</span>
              <Badge tone={STATUS[i.status]?.tone ?? "neutral"}>{STATUS[i.status]?.label ?? i.status}</Badge>
              {i.status === "PENDING" && (
                <span className="ml-auto flex items-center gap-2">
                  <Input value={notes[i.id] ?? ""} onChange={(e) => setNotes({ ...notes, [i.id]: e.target.value })} placeholder="Mã giao dịch / ngày nhận" className="h-8 w-48" aria-label={`Ghi chú thu tiền ${i.code}`} />
                  <Button type="button" size="sm" variant="outline" disabled={busy || (notes[i.id] ?? "").trim().length < 3}
                    onClick={() => void act(() => call(`/api/v1/platform/subscription-invoices/${i.id}/mark-paid`, "POST", { note: notes[i.id] }), "Đã ghi đã thu")}>
                    Đã thu
                  </Button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
