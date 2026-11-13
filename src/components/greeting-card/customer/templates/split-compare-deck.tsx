"use client"

import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/select"
import { useState } from "react"
import { ArrowLeftRight } from "@/components/ui/icons"
import type { GreetingCatalogProduct } from "@/modules/greeting-card/domain/greeting-card-types"
import { AuxPage, EmptyCatalog, ProductImage } from "./aux/aux-kit"
import { comparisonRows } from "./product-info/product-display"
import { useDisplayFields } from "./product-info/display-fields-context"
import { ProductInfo } from "./product-info/product-info"
import { EnterpriseSpecSheet } from "./enterprise-spec-sheet"

interface SplitCompareDeckProps {
  products: GreetingCatalogProduct[]
  catalogName: string
  selectedProductId: string | null
  onSelectProduct: (product: GreetingCatalogProduct) => void
}


function Picker({ products, value, onChange, label }: { products: GreetingCatalogProduct[]; value: number; onChange: (i: number) => void; label: string }) {
  return (
    <NativeSelect
      aria-label={label}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-10 w-full truncate rounded-xl border border-border bg-surface px-2 text-body-sm"
    >
      {products.map((p, i) => (
        <option key={p.id} value={i}>{p.name}</option>
      ))}
    </NativeSelect>
  )
}

/** So sánh: đặt hai mẫu cạnh nhau, đối chiếu giá và thành phần rồi chọn mẫu ưng ý. */
export function SplitCompareDeck({ products, catalogName, onSelectProduct }: SplitCompareDeckProps) {
  const [left, setLeft] = useState(0)
  const [right, setRight] = useState(Math.min(1, products.length - 1))
  // Dòng so sánh lấy từ nguồn chung + cấu hình bật/tắt của cửa hàng
  const ROWS = comparisonRows(useDisplayFields())
  const [open, setOpen] = useState<GreetingCatalogProduct | null>(null)

  if (products.length === 0) return <EmptyCatalog />
  const pair = [products[left], products[right]].filter((p): p is GreetingCatalogProduct => Boolean(p))
  const rows = ROWS.filter((r) => pair.some((p) => r.get(p)))

  return (
    <AuxPage eyebrow="So sánh" title={catalogName} subtitle="Đặt hai mẫu cạnh nhau để chọn mẫu hợp ý nhất.">
      {products.length > 1 && (
        <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <Picker products={products} value={left} onChange={setLeft} label="Mẫu bên trái" />
          <Button variant="outline"
            type="button"
            onClick={() => {
              setLeft(right)
              setRight(left)
            }}
            aria-label="Đổi chỗ hai mẫu"
            className="px-0 py-0 text-[length:inherit] font-[inherit] gap-0 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface hover:bg-surface"
          >
            <ArrowLeftRight size={16} aria-hidden="true" />
          </Button>
          <Picker products={products} value={right} onChange={setRight} label="Mẫu bên phải" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {pair.map((p, i) => (
          <article key={`${p.id}-${i}`} className="flex flex-col">
            <Button variant="ghost" type="button" onClick={() => setOpen(p)} className="text-[length:inherit] h-auto p-0 font-[inherit] gap-0 aspect-[3/4] overflow-hidden rounded-2xl bg-surface-alt hover:bg-surface-alt" aria-label={`Chi tiết ${p.name}`}>
              <ProductImage product={p} />
            </Button>
            <ProductInfo product={p} level="compact" size="sm" as="h2" titleClassName="min-h-[2.5em] font-semibold" className="mt-2" />
            <Button variant="primary"
              type="button"
              onClick={() => onSelectProduct(p)}
              className="px-0 py-0 gap-0 mt-2 h-11 rounded-xl bg-primary text-body-sm font-bold text-white active:scale-[0.99] hover:bg-primary"
            >
              Chọn mẫu này
            </Button>
          </article>
        ))}
      </div>

      {rows.length > 0 && (
        <dl className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface">
          {rows.map((r) => (
            <div key={r.label} className="border-b border-border px-4 py-3 last:border-0">
              <dt className="mb-1.5 text-caption font-semibold uppercase tracking-wider text-text-muted">{r.label}</dt>
              <div className="grid grid-cols-2 gap-3">
                {pair.map((p, i) => (
                  <dd key={i} className="text-body-sm">{r.get(p) || "—"}</dd>
                ))}
              </div>
            </div>
          ))}
        </dl>
      )}

      {open && (
        <EnterpriseSpecSheet
          product={open}
          isOpen
          onClose={() => setOpen(null)}
          onSelectProduct={(p) => {
            setOpen(null)
            onSelectProduct(p)
          }}
        />
      )}
    </AuxPage>
  )
}
