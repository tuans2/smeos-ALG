"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Disclosure } from "@/components/ui/disclosure"
import { InlineError } from "@/components/ui/inline-error"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import { formatCurrency } from "@/lib/i18n/formatters"
import { useSession } from "@/lib/session"

interface VatView {
  vatEnabled: boolean
  vatRate: number
  vatAmountVnd: number
  subtotalVnd: number
  totalVnd: number
  companyName: string | null
  taxCode: string | null
  companyAddress: string | null
  email: string | null
}

const field = "h-11 w-full rounded-xl border border-border bg-surface px-3 text-body-sm text-text"

/**
 * Hoá đơn VAT của đơn ngoài Thẻ chào (PO 07/11/2026): khách cần hoá đơn thì bật VAT 8% hoặc 10%, máy chủ tính lại
 * tổng tiền. Mặc định thu gọn; chỉ người có quyền báo giá (R15) mới sửa được.
 */
export function OrderVatSection({ orderId, onChanged }: { orderId: string; onChanged: () => void }) {
  const { can } = useSession()
  const canEdit = can("R15")
  const [vat, setVat] = useState<VatView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/v1/orders/${orderId}/vat`)
      .then(async (r) => (r.ok ? ((await r.json()) as { data: VatView }).data : null))
      .then(setVat)
      .catch(() => setVat(null))
  }, [orderId])

  if (!vat) return null

  async function save(next: VatView) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/orders/${orderId}/vat`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: next.vatEnabled,
          rate: next.vatRate,
          company_name: next.companyName,
          tax_code: next.taxCode,
          company_address: next.companyAddress,
          email: next.email,
        }),
      })
      const body = (await res.json().catch(() => null)) as { data?: VatView; error?: { message?: string } } | null
      if (!res.ok || !body?.data) throw new Error(body?.error?.message ?? "Chưa lưu được hoá đơn VAT")
      setVat(body.data)
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa lưu được hoá đơn VAT")
    } finally {
      setSaving(false)
    }
  }

  const text = (key: "companyName" | "taxCode" | "companyAddress" | "email", label: string) => (
    <label className="space-y-1 text-body-sm text-text">
      <span>{label}</span>
      <Input className={field} disabled={!canEdit} value={vat[key] ?? ""} onChange={(e) => setVat({ ...vat, [key]: e.target.value })} />
    </label>
  )

  return (
    <Disclosure label={vat.vatEnabled ? `Hoá đơn VAT ${vat.vatRate}% — ${formatCurrency(vat.vatAmountVnd)}` : "Hoá đơn VAT"} className="rounded-lg border border-border p-3">
      {error && <div className="mt-2"><InlineError message={error} /></div>}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="flex cursor-pointer items-center gap-2 text-body-sm text-text sm:col-span-2">
          <Checkbox checked={vat.vatEnabled} disabled={!canEdit} onCheckedChange={(checked) => setVat({ ...vat, vatEnabled: Boolean(checked) })} />
          Khách cần hoá đơn VAT
        </label>
        <label className="space-y-1 text-body-sm text-text">
          <span>Thuế suất</span>
          <NativeSelect disabled={!canEdit || !vat.vatEnabled} value={String(vat.vatRate)} onChange={(e) => setVat({ ...vat, vatRate: Number(e.target.value) })}>
            <option value="10">10%</option>
            <option value="8">8%</option>
          </NativeSelect>
        </label>
        {text("taxCode", "Mã số thuế")}
        {text("companyName", "Tên công ty")}
        {text("companyAddress", "Địa chỉ công ty")}
        {text("email", "Email nhận hoá đơn")}
        <div className="text-caption text-text-muted sm:col-span-2">
          Giá trước thuế {formatCurrency(vat.subtotalVnd)} · Thuế {formatCurrency(vat.vatAmountVnd)} · Tổng {formatCurrency(vat.totalVnd)}
        </div>
        {canEdit && (
          <div className="sm:col-span-2">
            <Button type="button" size="sm" variant="secondary" disabled={saving} onClick={() => void save(vat)}>Lưu hoá đơn VAT</Button>
          </div>
        )}
      </div>
    </Disclosure>
  )
}
