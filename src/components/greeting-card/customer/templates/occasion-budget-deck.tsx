"use client"

import { Button } from "@/components/ui/button"
import { useMemo, useState } from "react"
import type { GreetingCatalogProduct } from "@/modules/greeting-card/domain/greeting-card-types"
import { AuxPage, Chip, EmptyCatalog, ProductImage } from "./aux/aux-kit"
import { budgetsOf, matchProducts, occasionsOf } from "./aux/catalog-filters"
import { EnterpriseSpecSheet } from "./enterprise-spec-sheet"
import { ProductInfo } from "./product-info/product-info"

interface OccasionBudgetDeckProps {
  products: GreetingCatalogProduct[]
  catalogName: string
  selectedProductId: string | null
  onSelectProduct: (product: GreetingCatalogProduct) => void
}

function Question({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="mb-5">
      <legend className="mb-2.5 flex items-center gap-2 text-body font-semibold">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-caption font-bold text-white">{n}</span>
        {title}
      </legend>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">{children}</div>
    </fieldset>
  )
}

/** Gợi ý nhanh: chọn dịp tặng và ngân sách, hiện ngay các mẫu phù hợp. */
export function OccasionBudgetDeck({ products, catalogName, onSelectProduct }: OccasionBudgetDeckProps) {
  const occasions = useMemo(() => occasionsOf(products), [products])
  const budgets = useMemo(() => budgetsOf(products), [products])
  const [occasion, setOccasion] = useState<string | null>(null)
  const [budget, setBudget] = useState<string | null>(null)
  const [open, setOpen] = useState<GreetingCatalogProduct | null>(null)

  const results = matchProducts(products, occasion, budget)
  let q = 0

  if (products.length === 0) return <EmptyCatalog />

  return (
    <AuxPage eyebrow="Gợi ý cho bạn" title={catalogName} subtitle="Trả lời nhanh để xem những sản phẩm phù hợp nhất.">
      {occasions.length > 1 && (
        <Question n={++q} title="Bạn tìm sản phẩm cho dịp gì?">
          <Chip active={occasion === null} onClick={() => setOccasion(null)}>Dịp nào cũng được</Chip>
          {occasions.map((o) => (
            <Chip key={o} active={occasion === o} onClick={() => setOccasion(o)}>{o}</Chip>
          ))}
        </Question>
      )}
      {budgets.length > 1 && (
        <Question n={++q} title="Ngân sách của bạn khoảng bao nhiêu?">
          <Chip active={budget === null} onClick={() => setBudget(null)}>Tất cả</Chip>
          {budgets.map((b) => (
            <Chip key={b.id} active={budget === b.id} onClick={() => setBudget(b.id)}>{b.label}</Chip>
          ))}
        </Question>
      )}

      <section aria-live="polite" aria-labelledby="result-title" className="border-t border-border pt-5">
        <h2 id="result-title" className="mb-3 text-body font-semibold">
          {results.length > 0 ? `${results.length} mẫu phù hợp` : "Chưa có mẫu khớp lựa chọn"}
        </h2>
        {results.length === 0 ? (
          <div className="rounded-2xl bg-surface-alt p-5 text-center">
            <p className="text-body-sm text-text-muted">Thử nới ngân sách hoặc chọn dịp khác nhé.</p>
            <Button variant="outline"
              type="button"
              onClick={() => {
                setOccasion(null)
                setBudget(null)
              }}
              className="py-0 gap-0 mt-3 h-10 rounded-full border border-border bg-surface px-4 text-body-sm font-semibold hover:bg-surface"
            >
              Xem tất cả mẫu
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {results.map((p) => (
              <li key={p.id} className="flex gap-3 rounded-2xl border border-border bg-surface p-3">
                <Button variant="ghost" type="button" onClick={() => setOpen(p)} className="px-0 py-0 text-[length:inherit] font-[inherit] gap-0 h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-surface-alt hover:bg-surface-alt" aria-label={`Chi tiết ${p.name}`}>
                  <ProductImage product={p} />
                </Button>
                <div className="flex min-w-0 flex-1 flex-col">
                  <ProductInfo product={p} level="standard" size="sm" muted="var(--color-text-muted)" titleClassName="font-semibold" />
                  <div className="mt-auto flex gap-2 pt-2">
                    <Button variant="primary" type="button" onClick={() => onSelectProduct(p)} className="px-0 py-0 gap-0 h-10 flex-1 rounded-xl bg-primary text-body-sm font-bold text-white hover:bg-primary">
                      Đặt mẫu
                    </Button>
                    <Button variant="outline" type="button" onClick={() => setOpen(p)} className="py-0 gap-0 h-10 rounded-xl border border-border px-3 text-body-sm font-semibold">
                      Chi tiết
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

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
