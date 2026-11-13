"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check } from "@/components/ui/icon-set/check"
import { Package } from "@/components/ui/icon-set/package"
import { EmptyState } from "@/components/ui/empty-state"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { safeImageSrc } from "@/lib/safe-image-src"
import { MAX_FEATURED_PRODUCTS } from "@/modules/brand-kit/domain/brand-assets"

interface ProductItem { id: string; name: string; masterImageUrl?: string | null }

interface FeaturedProductsPickerProps {
  selected: readonly string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}

/** Chọn sản phẩm chủ đạo từ Kho sản phẩm của cửa hàng (tối đa 6) — dùng cho trang landing chính thức. */
export function FeaturedProductsPicker({ selected, onChange, disabled = false }: FeaturedProductsPickerProps) {
  const [items, setItems] = useState<ProductItem[] | null>(null)

  useEffect(() => {
    let alive = true
    fetch("/api/v1/products?status=ACTIVE&limit=100")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { data?: ProductItem[] } | null) => { if (alive) setItems(j?.data ?? []) })
      .catch(() => { if (alive) setItems([]) })
    return () => { alive = false }
  }, [])

  if (items === null) return <SkeletonBlock lines={3} label="Đang tải kho sản phẩm" />
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="Chưa có sản phẩm đang bán"
        reason="Thêm sản phẩm vào kho để chọn sản phẩm chủ đạo."
        action={{ label: "Thêm sản phẩm", href: "/san-pham/tao-moi" }}
      />
    )
  }

  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id))
    else if (selected.length < MAX_FEATURED_PRODUCTS) onChange([...selected, id])
  }

  return (
    <div className="space-y-3">
      <p className="text-caption text-text-muted" aria-live="polite">
        Đã chọn {selected.length}/{MAX_FEATURED_PRODUCTS} sản phẩm ·{" "}
        <Link href="/san-pham" className="font-semibold text-primary hover:underline">Quản lý kho sản phẩm</Link>
      </p>
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((p) => {
          const on = selected.includes(p.id)
          const full = !on && selected.length >= MAX_FEATURED_PRODUCTS
          const src = safeImageSrc(p.masterImageUrl ?? null)
          return (
            <li key={p.id}>
              <Button
                type="button"
                variant="ghost"
                aria-pressed={on}
                disabled={disabled || full}
                onClick={() => toggle(p.id)}
                className={`relative h-auto w-full flex-col items-stretch justify-start whitespace-normal text-left rounded-xl border p-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed ${
                  on ? "border-primary bg-selected" : "border-border bg-surface hover:border-primary/40"
                } ${full ? "opacity-60" : ""}`}
              >
                <div className="aspect-square w-full overflow-hidden rounded-lg bg-surface-alt">
                  {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <Package size={28} aria-hidden className="m-auto mt-8 text-text-muted" />}
                </div>
                <span className="mt-2 block text-caption font-semibold text-text line-clamp-2">{p.name}</span>
                {on && (
                  <span className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-surface">
                    <Check size={14} aria-hidden />
                  </span>
                )}
              </Button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
