"use client"

import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import { formatCurrency } from "@/lib/i18n/formatters"

import type { ProductItem } from "./quotation-types"

/** Chọn phiên bản kích cỡ cho từng mẫu và nhập phí vận chuyển của báo giá (checklist ALG 3.8). */
export function QuoteLineOptions({ products, variantOf, onVariantChange, shippingFee, onShippingChange }: {
  products: ProductItem[]
  variantOf: Record<string, string>
  onVariantChange: (productId: string, optionId: string) => void
  shippingFee: number
  onShippingChange: (vnd: number) => void
}) {
  const withOptions = products.filter((p) => (p.options ?? []).length > 0)
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 text-body-sm">
      {withOptions.map((p) => (
        <label key={p.id} className="flex items-center justify-between gap-2 text-text">
          <span className="min-w-0 truncate">{p.title}</span>
          <NativeSelect value={variantOf[p.id] ?? ""} onChange={(e) => onVariantChange(p.id, e.target.value)} className="w-48" aria-label={`Phiên bản ${p.title}`}>
            <option value="">Giá gốc ({formatCurrency(p.price)})</option>
            {(p.options ?? []).map((o) => <option key={o.id} value={o.id}>{o.name} — {formatCurrency(o.priceVnd)}</option>)}
          </NativeSelect>
        </label>
      ))}
      <label className="flex items-center justify-between gap-2 text-text">
        Phí vận chuyển
        <Input inputMode="numeric" value={shippingFee ? String(shippingFee) : ""} onChange={(e) => onShippingChange(Number(e.target.value.replace(/\D/g, "")) || 0)} placeholder="0" className="h-9 w-36 text-right" aria-label="Phí vận chuyển" />
      </label>
    </div>
  )
}
