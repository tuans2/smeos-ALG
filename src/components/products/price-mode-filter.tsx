"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { PRICE_MODE_FILTERS, productPriceMode, type PriceModeFilter } from "./product-price-span"

interface Props {
  value: PriceModeFilter
  onChange: (v: PriceModeFilter) => void
  /** Sản phẩm sau các bộ lọc khác — để đếm số mẫu mỗi kiểu giá */
  products: ReadonlyArray<{ attributes?: Record<string, unknown> | null | undefined }>
}

/** Lọc theo kiểu giá: Giá xác định / Khoảng giá / Liên hệ, kèm số mẫu. */
export function PriceModeFilterBar({ value, onChange, products }: Props) {
  const counts = { all: products.length, FIXED: 0, RANGE: 0, CONTACT: 0 }
  for (const p of products) counts[productPriceMode(p)]++
  return (
    <div role="radiogroup" aria-label="Lọc theo kiểu giá" className="flex flex-wrap items-center gap-2 px-4 pt-3">
      <span className="text-caption font-semibold text-text-muted">Kiểu giá:</span>
      {PRICE_MODE_FILTERS.map((f) => (
        <Button
          key={f.id}
          type="button"
          variant="outline"
          size="sm"
          role="radio"
          aria-checked={value === f.id}
          onClick={() => onChange(f.id)}
          className={`min-h-8 rounded-full border px-3 text-caption font-semibold transition-colors h-auto py-1 ${
            value === f.id ? "border-primary bg-primary/10 text-primary hover:bg-primary/10" : "border-border bg-surface text-text hover:bg-surface-alt"
          }`}
        >
          {f.label} ({counts[f.id]})
        </Button>
      ))}
    </div>
  )
}
