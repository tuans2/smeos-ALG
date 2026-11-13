"use client"

import { useMemo, useState } from "react"
import type { GreetingCatalogProduct } from "@/modules/greeting-card/domain/greeting-card-types"
import { AuxPage, Chip, EmptyCatalog, ProductTile, useShortlist } from "./aux/aux-kit"
import { EnterpriseSpecSheet } from "./enterprise-spec-sheet"

interface LookbookGridDeckProps {
  products: GreetingCatalogProduct[]
  catalogName: string
  selectedProductId: string | null
  onSelectProduct: (product: GreetingCatalogProduct) => void
}

const PRICE_FILTERS = [
  { id: "all", label: "Tất cả", test: () => true },
  { id: "lt500", label: "Dưới 500.000 ₫", test: (p: number | null) => p !== null && p < 500_000 },
  { id: "500-1m", label: "500.000 – 1 triệu", test: (p: number | null) => p !== null && p >= 500_000 && p <= 1_000_000 },
  { id: "gt1m", label: "Trên 1 triệu", test: (p: number | null) => p !== null && p > 1_000_000 },
] as const

/** Lookbook: lưới ảnh lớn như cửa hàng thời trang, lọc theo giá, chạm để xem chi tiết. */
export function LookbookGridDeck({ products, catalogName, selectedProductId, onSelectProduct }: LookbookGridDeckProps) {
  const [filterId, setFilterId] = useState<(typeof PRICE_FILTERS)[number]["id"]>("all")
  const [open, setOpen] = useState<GreetingCatalogProduct | null>(null)
  const shortlist = useShortlist()

  // Chỉ hiện mức giá có sản phẩm
  const filters = useMemo(
    () => PRICE_FILTERS.filter((f) => f.id === "all" || products.some((p) => f.test(p.price))),
    [products],
  )
  const active = PRICE_FILTERS.find((f) => f.id === filterId) ?? PRICE_FILTERS[0]
  const visible = products.filter((p) => active.test(p.price))

  if (products.length === 0) return <EmptyCatalog />

  return (
    <AuxPage eyebrow="Lookbook" title={catalogName} subtitle={`${products.length} sản phẩm · chạm vào ảnh để xem chi tiết`}>
      {filters.length > 2 && (
        <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="group" aria-label="Lọc theo giá">
          {filters.map((f) => (
            <Chip key={f.id} active={filterId === f.id} onClick={() => setFilterId(f.id)}>
              {f.label}
            </Chip>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-3 gap-y-6">
        {visible.map((p, i) => (
          <div key={p.id} className={i % 2 === 1 ? "mt-8" : undefined}>
            <ProductTile
              product={p}
              liked={shortlist.has(p.id)}
              onLike={() => shortlist.toggle(p.id)}
              onOpen={() => setOpen(p)}
              selected={selectedProductId === p.id}
            />
          </div>
        ))}
      </div>

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
