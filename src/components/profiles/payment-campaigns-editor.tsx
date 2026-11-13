"use client"

import React from "react"
import { Plus } from "@/components/ui/icon-set/plus"
import { Trash2 } from "@/components/ui/icon-set/trash2"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { FULL_PAYMENT, policyLabel, type PolicyCampaign } from "@/modules/greeting-card/domain/payment-plan"

export const POLICY_CHOICES = [FULL_PAYMENT, "DEPOSIT_20", "DEPOSIT_30", "DEPOSIT_40", "DEPOSIT_50", "DEPOSIT_70"]
export const FIELD = "h-9 px-2 rounded-lg border border-border bg-surface text-body-sm"

export function PolicySelect({ value, onChange, label }: { value: string; onChange: (policy: string) => void; label: string }) {
  const options = POLICY_CHOICES.includes(value) ? POLICY_CHOICES : [...POLICY_CHOICES, value]
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="h-9 w-[160px] text-body-sm">
        <SelectValue placeholder="Chọn cách thu" />
      </SelectTrigger>
      <SelectContent>
        {options.map((p) => (
          <SelectItem key={p} value={p}>
            {policyLabel(p)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * Đợt thu tiền: trong khoảng ngày giao này, cách thu mặc định đổi theo đợt (VD: dịp 20/10 thu 100%).
 * Mã thanh toán khách nhập vẫn ghi đè cách thu của đợt.
 */
export function PaymentCampaignsEditor({ campaigns, onChange }: { campaigns: PolicyCampaign[]; onChange: (next: PolicyCampaign[]) => void }) {
  const set = (i: number, patch: Partial<PolicyCampaign>) => onChange(campaigns.map((c, j) => (j === i ? { ...c, ...patch } : c)))
  return (
    <section className="flex flex-col gap-2">
      <p className="font-bold text-text">Cách thu theo đợt (dịp lễ, chiến dịch)</p>
      <p className="text-caption text-text-muted">Đơn có ngày giao trong đợt sẽ thu theo cách của đợt thay cho mặc định của tiệm.</p>
      {campaigns.map((c, i) => (
        <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2">
          <Input aria-label="Tên đợt" value={c.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="VD: Ngày 20/10" className="h-9 flex-1 min-w-32 text-body-sm" />
          <PolicySelect label="Cách thu của đợt" value={c.policy} onChange={(policy) => set(i, { policy })} />
          <Input aria-label="Từ ngày giao" type="date" value={c.startsOn} onChange={(e) => set(i, { startsOn: e.target.value })} className="h-9 w-36 text-body-sm" />
          <Input aria-label="Đến ngày giao" type="date" value={c.endsOn} onChange={(e) => set(i, { endsOn: e.target.value })} className="h-9 w-36 text-body-sm" />
          <label className="flex items-center gap-1.5 text-body-sm text-text cursor-pointer">
            <Checkbox checked={c.active} onCheckedChange={(checked) => set(i, { active: Boolean(checked) })} />
            <span>Bật</span>
          </label>
          <Button type="button" size="sm" variant="ghost" aria-label={`Xoá đợt ${c.name}`} onClick={() => onChange(campaigns.filter((_, j) => j !== i))}>
            <Trash2 size={14} />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="self-start gap-1"
        onClick={() => onChange([...campaigns, { id: `camp-${Date.now()}`, name: "", policy: FULL_PAYMENT, active: true, startsOn: "", endsOn: "" }])}
      >
        <Plus size={14} /> Thêm đợt
      </Button>
    </section>
  )
}
