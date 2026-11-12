"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import { Receipt } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { apiSend } from "@/components/greeting-card/greeting-api"

export interface OrderVatData {
  orderId: string
  vatEnabled: boolean
  vatRate: number
  vatAmountVnd: number
  subtotalVnd: number
  totalVnd: number
  paidVnd: number
  balanceVnd: number
  companyName: string | null
  taxCode: string | null
  companyAddress: string | null
  email: string | null
}

const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3 py-2 text-body-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/40"

/** Ô bật hoá đơn VAT (8%/10%) + thông tin xuất hoá đơn tách ô riêng. Tổng tiền do máy chủ tính lại. */
export function OrderVatForm({ vat, onSaved }: { vat: OrderVatData; onSaved: (next: OrderVatData) => void }) {
  const [enabled, setEnabled] = useState(vat.vatEnabled)
  const [rate, setRate] = useState<8 | 10>(vat.vatRate === 8 ? 8 : 10)
  const [companyName, setCompanyName] = useState(vat.companyName ?? "")
  const [taxCode, setTaxCode] = useState(vat.taxCode ?? "")
  const [companyAddress, setCompanyAddress] = useState(vat.companyAddress ?? "")
  const [email, setEmail] = useState(vat.email ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const preview = Math.round((vat.subtotalVnd * rate) / 100)

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await apiSend<{ data: OrderVatData }>(
        `/api/v1/greeting-card/orders/${vat.orderId}/vat`,
        "PUT",
        { enabled, rate, company_name: companyName, tax_code: taxCode, company_address: companyAddress, email },
        "Không lưu được hoá đơn VAT"
      )
      onSaved(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được hoá đơn VAT")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <label className="flex items-center gap-2 text-body-sm font-bold text-text">
        <Checkbox checked={enabled} onCheckedChange={(checked) => setEnabled((checked === true))} className="h-4 w-4 accent-primary" />
        <Receipt size={15} className="text-primary" />
        <span>Xuất hoá đơn VAT</span>
      </label>

      {enabled && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-body-sm">
            <span className="text-text-muted">Thuế suất:</span>
            {([8, 10] as const).map((r) => (
              <Button variant="outline"
                key={r}
                type="button"
                onClick={() => setRate(r)}
                className={`text-[length:inherit] h-auto gap-0 rounded-full border px-3 py-1 font-semibold ${rate === r ? "border-primary bg-primary/10 text-primary hover:bg-primary/10" : "border-border text-text-muted"}`}
              >
                {r}%
              </Button>
            ))}
            <span className="text-text-muted">
              · Tiền VAT: <strong className="text-text">{preview.toLocaleString("vi-VN")} đ</strong>
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input className={inputClass} placeholder="Tên công ty" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            <Input className={inputClass} placeholder="Mã số thuế" inputMode="numeric" value={taxCode} onChange={(e) => setTaxCode(e.target.value)} />
            <Input className={`${inputClass} sm:col-span-2`} placeholder="Địa chỉ xuất hoá đơn" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} />
            <Input className={`${inputClass} sm:col-span-2`} placeholder="Email nhận hoá đơn" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </>
      )}

      {error && <p className="text-caption font-semibold text-danger">{error}</p>}
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={save} disabled={saving} className="h-8 text-caption font-bold">
          {saving ? "Đang lưu..." : "Lưu hoá đơn VAT"}
        </Button>
      </div>
    </div>
  )
}
