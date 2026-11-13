"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ALL_INDUSTRY_KEYS, getIndustryPlugin } from "@/modules/organization/domain/industry-profile"
import { PLAN_OPTIONS } from "./subscription-panel"

const INDUSTRIES = ALL_INDUSTRY_KEYS.map((id) => ({ id, label: getIndustryPlugin(id).identity.name }))

/**
 * Console → Tổ chức → Tạo tổ chức (checklist ALG 9.10): cửa hàng, ngành, chủ tiệm (mật khẩu tạm, buộc đổi ở lần
 * đăng nhập đầu) và gói thuê bao. Mật khẩu tạm hiện một lần sau khi tạo.
 */
export function CreateOrganizationCard({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ name: "", email: "", owner: "", industry: "FLORAL", withPlan: true, plan: "PRO", cycle: "MONTHLY", price: "", credits: "0", paid: false })
  const [result, setResult] = useState<{ ownerEmail: string; temporaryPassword: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true); setError(null); setResult(null)
    const res = await fetch("/api/v1/platform/organizations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationName: f.name, ownerEmail: f.email, ownerName: f.owner || undefined, industry: f.industry,
        ...(f.withPlan ? { subscription: { plan: f.plan, cycle: f.cycle, priceVnd: Number(f.price || 0), includedCreditsMonthly: Number(f.credits || 0), firstPeriodPaid: f.paid } } : {}),
      }),
    }).catch(() => null)
    setBusy(false)
    const j = (await res?.json().catch(() => null)) as { data?: { ownerEmail: string; temporaryPassword: string }; error?: { message?: string } } | null
    if (!res?.ok || !j?.data) { setError(j?.error?.message ?? "Không tạo được tổ chức"); return }
    setResult(j.data)
    setF({ ...f, name: "", email: "", owner: "" })
    onCreated?.()
  }

  if (!open) return <div className="flex justify-end"><Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>Tạo tổ chức</Button></div>
  return (
    <Card className="space-y-3 p-4">
      <p className="text-body-sm font-bold text-text">Tạo tổ chức mới</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Tên cửa hàng" className="h-9" aria-label="Tên cửa hàng" />
        <NativeSelect value={f.industry} onChange={(e) => setF({ ...f, industry: e.target.value })} aria-label="Ngành">
          {INDUSTRIES.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
        </NativeSelect>
        <Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="Thư chủ tiệm" className="h-9" aria-label="Thư chủ tiệm" />
        <Input value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} placeholder="Tên chủ tiệm" className="h-9" aria-label="Tên chủ tiệm" />
      </div>
      <label className="flex items-center gap-2 text-caption text-text">
        <Switch checked={f.withPlan} onCheckedChange={(v) => setF({ ...f, withPlan: v })} aria-label="Gán gói thuê bao" /> Gán gói thuê bao
      </label>
      {f.withPlan && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
          <NativeSelect value={f.plan} onChange={(e) => setF({ ...f, plan: e.target.value })} aria-label="Gói">
            {PLAN_OPTIONS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </NativeSelect>
          <NativeSelect value={f.cycle} onChange={(e) => setF({ ...f, cycle: e.target.value })} aria-label="Chu kỳ">
            <option value="MONTHLY">Theo tháng</option>
            <option value="YEARLY">Theo năm</option>
          </NativeSelect>
          <Input inputMode="numeric" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value.replace(/\D/g, "") })} placeholder="Giá mỗi kỳ (đ)" className="h-9" aria-label="Giá mỗi kỳ" />
          <Input inputMode="numeric" value={f.credits} onChange={(e) => setF({ ...f, credits: e.target.value.replace(/\D/g, "") })} placeholder="Credit tặng/tháng" className="h-9" aria-label="Credit tặng mỗi tháng" />
          <label className="flex items-center gap-2 text-caption text-text sm:col-span-4">
            <Switch checked={f.paid} onCheckedChange={(v) => setF({ ...f, paid: v })} aria-label="Đã thu tiền kỳ đầu" /> Đã thu tiền kỳ đầu (chưa thu thì cửa hàng ở chế độ chỉ xem tới khi thanh toán)
          </label>
        </div>
      )}
      {error && <p role="alert" className="text-caption text-danger-text">{error}</p>}
      {result && (
        <p role="status" className="rounded-xl border border-success/30 bg-success-bg p-3 text-caption text-success-text">
          Đã tạo. Gửi cho chủ tiệm: đăng nhập bằng {result.ownerEmail}, mật khẩu tạm <span className="font-mono font-bold">{result.temporaryPassword}</span> — hệ thống buộc đổi ở lần đăng nhập đầu. Mật khẩu này chỉ hiện một lần.
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Đóng</Button>
        <Button type="button" size="sm" disabled={busy || !f.name.trim() || !f.email.trim() || (f.withPlan && f.price === "")} onClick={() => void submit()}>Tạo</Button>
      </div>
    </Card>
  )
}
