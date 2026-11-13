"use client"

import { Button } from "@/components/ui/button"
import { useMemo, useState } from "react"
import type { GreetingCatalogProduct } from "@/modules/greeting-card/domain/greeting-card-types"
import { AuxPage, EmptyCatalog, ProductTile, useShortlist } from "./aux/aux-kit"
import { ALL_MOODS_SWATCH, matchesMood, moodsOf } from "./aux/catalog-filters"
import { EnterpriseSpecSheet } from "./enterprise-spec-sheet"

interface ColorMoodboardDeckProps {
  products: GreetingCatalogProduct[]
  catalogName: string
  selectedProductId: string | null
  onSelectProduct: (product: GreetingCatalogProduct) => void
}

/** Bảng màu: chọn tông màu yêu thích, xem các mẫu cùng tông như một moodboard. */
export function ColorMoodboardDeck({ products, catalogName, selectedProductId, onSelectProduct }: ColorMoodboardDeckProps) {
  const moods = useMemo(() => moodsOf(products), [products])
  const [moodId, setMoodId] = useState<string | null>(null)
  const [open, setOpen] = useState<GreetingCatalogProduct | null>(null)
  const shortlist = useShortlist()

  const mood = moods.find((m) => m.id === moodId) ?? null
  const visible = mood ? products.filter((p) => matchesMood(p, mood)) : products

  if (products.length === 0) return <EmptyCatalog />

  return (
    <AuxPage
      eyebrow="Bảng màu"
      title={catalogName}
      subtitle={moods.length > 1 ? "Chọn tông màu bạn thích để xem các mẫu cùng tông." : `${products.length} sản phẩm`}
    >
      {moods.length > 1 && (
        <div className="-mx-4 mb-6 flex gap-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="group" aria-label="Lọc theo tông màu">
          {[{ id: null, label: "Tất cả", swatch: ALL_MOODS_SWATCH }, ...moods].map((m) => {
            const active = moodId === m.id
            return (
              <Button variant="ghost"
                key={m.id ?? "all"}
                type="button"
                aria-pressed={active}
                onClick={() => setMoodId(m.id)}
                className="text-[length:inherit] h-auto p-0 font-[inherit] flex w-16 shrink-0 flex-col items-center gap-1.5"
              >
                <span
                  className={`h-14 w-14 rounded-full border border-black/10 transition-transform ${active ? "scale-105 ring-2 ring-text ring-offset-2 ring-offset-bg" : ""}`}
                  style={{ background: m.swatch }}
                />
                <span className={`text-center text-caption leading-tight ${active ? "font-bold text-text" : "text-text-muted"}`}>{m.label}</span>
              </Button>
            )
          })}
        </div>
      )}

      {moods.length > 1 && (
        <p className="mb-3 text-body-sm text-text-muted" aria-live="polite">
          {mood ? `${visible.length} mẫu tông ${mood.label.toLowerCase()}` : `${products.length} sản phẩm`}
        </p>
      )}
      <div className="grid grid-cols-2 gap-x-3 gap-y-6">
        {visible.map((p) => (
          <ProductTile
            key={p.id}
            product={p}
            aspect="aspect-square"
            liked={shortlist.has(p.id)}
            onLike={() => shortlist.toggle(p.id)}
            onOpen={() => setOpen(p)}
            selected={selectedProductId === p.id}
          />
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
