"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import type { GreetingCatalogProduct } from "@/modules/greeting-card/domain/greeting-card-types"
import { EmptyCatalog, HeartToggle, ProductImage, useShortlist } from "./aux/aux-kit"
import { EnterpriseSpecSheet } from "./enterprise-spec-sheet"
import { rootHeight, useEmbeddedPreview } from "./aux/embedded"
import { ProductInfo } from "./product-info/product-info"

interface EditorialStoryDeckProps {
  products: GreetingCatalogProduct[]
  catalogName: string
  selectedProductId: string | null
  onSelectProduct: (product: GreetingCatalogProduct) => void
}

/** Câu chuyện: dàn trang như tạp chí — ảnh lớn, số thứ tự, lời kể về ý nghĩa sản phẩm. */
export function EditorialStoryDeck({ products, catalogName, onSelectProduct }: EditorialStoryDeckProps) {
  const embedded = useEmbeddedPreview()
  const shortlist = useShortlist()
  const [open, setOpen] = useState<GreetingCatalogProduct | null>(null)

  if (products.length === 0) return <EmptyCatalog />

  return (
    <div className={`${rootHeight(embedded)} w-full bg-bg text-text`}>
      <div className="mx-auto w-full max-w-[480px] pb-12">
        <header className="px-6 pb-8 pt-10 text-center">
          <p className="text-caption font-semibold uppercase tracking-[0.3em] text-primary">Câu chuyện bộ sưu tập</p>
          <h1 className="mt-3 font-serif text-display-lg font-medium leading-[1.05] tracking-tight">{catalogName}</h1>
          <p className="mt-3 text-body-sm text-text-muted">{products.length} sản phẩm, mỗi mẫu một lời nhắn</p>
          <span aria-hidden="true" className="mx-auto mt-6 block h-10 w-px bg-border" />
        </header>

        <ol className="flex flex-col gap-14">
          {products.map((p, i) => {
            return (
              <li key={p.id}>
                <article aria-labelledby={`story-${p.id}`}>
                  <div className="relative mx-4 aspect-[4/5] overflow-hidden rounded-[4px] bg-surface-alt">
                    <ProductImage product={p} />
                    <HeartToggle active={shortlist.has(p.id)} onToggle={() => shortlist.toggle(p.id)} name={p.name} className="absolute right-3 top-3" />
                  </div>
                  <div className="px-6 pt-5">
                    <div className="flex items-baseline gap-3">
                      <span className="font-serif text-display font-light text-primary tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                      <span aria-hidden="true" className="h-px flex-1 bg-border" />
                    </div>
                    <ProductInfo
                      product={p}
                      level="full"
                      size="lg"
                      as="h2"
                      id={`story-${p.id}`}
                      muted="var(--color-text-muted)"
                      titleClassName="font-serif font-medium"
                      className="mt-2"
                    />
                    <div className="mt-5 flex gap-2">
                      <Button variant="ghost"
                        type="button"
                        onClick={() => onSelectProduct(p)}
                        className="px-0 py-0 gap-0 h-11 flex-1 rounded-full bg-text text-body-sm font-bold text-surface active:scale-[0.99] hover:bg-text"
                      >
                        Đặt mẫu này
                      </Button>
                      <Button variant="outline"
                        type="button"
                        onClick={() => setOpen(p)}
                        className="py-0 gap-0 h-11 rounded-full border border-border px-5 text-body-sm font-semibold"
                      >
                        Chi tiết
                      </Button>
                    </div>
                  </div>
                </article>
              </li>
            )
          })}
        </ol>
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
    </div>
  )
}
