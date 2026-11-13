"use client"

import { useEffect, useState } from "react"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSession } from "@/lib/session"

export interface OrderAdvancedFilterValue {
  deliveryFrom: string
  deliveryTo: string
  saleId: string
  branchId: string
}

export const EMPTY_ORDER_FILTER: OrderAdvancedFilterValue = { deliveryFrom: "", deliveryTo: "", saleId: "", branchId: "" }

/** Chuỗi truy vấn cho `GET /orders` và `GET /greeting-card/orders` (checklist ALG 4.3). */
export function orderFilterQuery(v: OrderAdvancedFilterValue): string {
  const p = new URLSearchParams()
  if (v.deliveryFrom) p.set("delivery_from", v.deliveryFrom)
  if (v.deliveryTo) p.set("delivery_to", v.deliveryTo)
  if (v.saleId) p.set("sale_id", v.saleId)
  if (v.branchId) p.set("branch_id", v.branchId)
  return p.toString()
}

type Option = { id: string; label: string }
const ALL = "ALL"

/** Lọc đơn theo khoảng ngày giao, nhân viên bán, chi nhánh. Danh sách nhân viên/chi nhánh chỉ hiện khi tài khoản được xem. */
export function OrderAdvancedFilters({ value, onChange }: { value: OrderAdvancedFilterValue; onChange: (v: OrderAdvancedFilterValue) => void }) {
  const { can } = useSession()
  const [members, setMembers] = useState<Option[]>([])
  const [branches, setBranches] = useState<Option[]>([])
  const canSeeMembers = Boolean(can("F1"))
  const canSeeBranches = Boolean(can("F6"))

  useEffect(() => {
    if (!canSeeMembers) return
    fetch("/api/v1/members")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((j: { data?: { user: { id: string; name: string | null; email: string }; status: string }[] }) =>
        setMembers((j.data ?? []).filter((m) => m.status === "ACTIVE").map((m) => ({ id: m.user.id, label: m.user.name || m.user.email })))
      )
      .catch(() => setMembers([]))
  }, [canSeeMembers])

  useEffect(() => {
    if (!canSeeBranches) return
    fetch("/api/v1/branches")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((j: { data?: { id: string; name: string }[] }) => setBranches((j.data ?? []).map((b) => ({ id: b.id, label: b.name }))))
      .catch(() => setBranches([]))
  }, [canSeeBranches])

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Lọc nâng cao">
      <label className="flex items-center gap-1 text-caption text-text-muted">
        Giao từ
        <Input type="date" value={value.deliveryFrom} onChange={(e) => onChange({ ...value, deliveryFrom: e.target.value })} className="h-9 w-40" aria-label="Giao từ ngày" />
      </label>
      <label className="flex items-center gap-1 text-caption text-text-muted">
        đến
        <Input type="date" value={value.deliveryTo} onChange={(e) => onChange({ ...value, deliveryTo: e.target.value })} className="h-9 w-40" aria-label="Giao đến ngày" />
      </label>
      {members.length > 0 && (
        <Select value={value.saleId || ALL} onValueChange={(v: string) => onChange({ ...value, saleId: v === ALL ? "" : v })}>
          <SelectTrigger className="h-9 w-48" aria-label="Nhân viên bán"><SelectValue>{(v: string) => (v === ALL ? "Mọi nhân viên" : (members.find((m) => m.id === v)?.label ?? v))}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Mọi nhân viên</SelectItem>
            {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {branches.length > 1 && (
        <Select value={value.branchId || ALL} onValueChange={(v: string) => onChange({ ...value, branchId: v === ALL ? "" : v })}>
          <SelectTrigger className="h-9 w-44" aria-label="Chi nhánh"><SelectValue>{(v: string) => (v === ALL ? "Mọi chi nhánh" : (branches.find((x) => x.id === v)?.label ?? v))}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Mọi chi nhánh</SelectItem>
            {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
