"use client"

import { Button } from "@/components/ui/button"
import React, { useMemo } from "react"
import { availableValues, matchOption, type SellableOption } from "@/modules/products/domain/product-pricing"

interface Props {
  dimensions: Array<{ label: string; values: string[] }>
  variants: Array<{ id: string; name: string; priceVnd: number; peakPriceVnd?: number | null | undefined; values?: string[] | undefined; imageUrl?: string | null | undefined }>
  value: string
  onChange: (variantId: string) => void
  error?: string | undefined
}

const vnd = (n: number) => `${n.toLocaleString("vi-VN")} đ`

/** Khách chọn lần lượt từng nhóm (Kích cỡ → Màu…); lựa chọn không có / hết bán bị mờ. Đủ nhóm → ra đúng một giá. */
export function VariantStepPicker({ dimensions, variants, value, onChange, error }: Props) {
  const options: SellableOption[] = useMemo(
    () =>
      variants
        .filter((v) => Array.isArray(v.values))
        .map((v) => ({ id: v.id, name: v.name, values: v.values!, priceVnd: v.priceVnd, peakPriceVnd: v.peakPriceVnd ?? null, imageAssetId: null, stemCount: null, imageUrl: v.imageUrl ?? null })),
    [variants]
  )
  const current = options.find((o) => o.id === value) ?? null
  const [draft, setDraft] = React.useState<(string | null)[]>(() => dimensions.map((_, i) => current?.values[i] ?? null))
  const picked = current ? current.values : draft

  const pick = (dim: number, v: string) => {
    const next = picked.map((p, i) => (i === dim ? (p === v ? null : v) : p))
    // Giá trị nhóm khác không còn đi cùng lựa chọn mới → bỏ chọn nhóm đó
    const cleaned = next.map((p, i) => (p !== null && i !== dim && !availableValues(options, next, i).has(p) ? null : p))
    setDraft(cleaned)
    onChange(matchOption(options, cleaned)?.id ?? "")
  }

  const matched = matchOption(options, picked)
  return (
    <div className="flex flex-col gap-3 sm:col-span-2">
      {dimensions.map((d, i) => {
        const avail = availableValues(options, picked, i)
        return (
          <div key={d.label} role="group" aria-label={d.label} className="flex flex-col gap-1">
            <span className="text-caption font-bold text-text">{d.label}</span>
            <div className="flex flex-wrap gap-2">
              {d.values.map((v) => {
                const on = picked[i] === v
                const ok = avail.has(v)
                return (
                  <Button variant="outline"
                    key={v}
                    type="button"
                    aria-pressed={on}
                    disabled={!ok && !on}
                    onClick={() => pick(i, v)}
                    className={`py-0 gap-0 min-h-10 rounded-full border px-4 text-body-sm font-semibold transition-colors disabled:opacity-40 disabled:line-through ${
                      on ? "border-primary bg-primary/10 text-primary hover:bg-primary/10" : "border-border bg-bg text-text hover:bg-bg"
                    }`}
                  >
                    {v}
                  </Button>
                )
              })}
            </div>
          </div>
        )
      })}
      <div className="flex items-center gap-3 rounded-lg bg-surface-alt/60 p-2" aria-live="polite">
        {matched?.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- ảnh phiên bản do tiệm tải, kích thước nhỏ
          <img src={matched.imageUrl} alt={matched.name} className="h-14 w-14 rounded-lg object-cover" />
        )}
        <span className="text-body-sm text-text">
          {matched ? (
            <>
              <strong>{matched.name}</strong> — {vnd(matched.priceVnd)}
              {matched.peakPriceVnd && matched.peakPriceVnd !== matched.priceVnd ? ` (ngày cao điểm ${vnd(matched.peakPriceVnd)})` : ""}
            </>
          ) : (
            "Chọn đủ các mục trên để xem giá chính xác"
          )}
        </span>
      </div>
      {error && <span className="text-caption text-danger">{error}</span>}
    </div>
  )
}
