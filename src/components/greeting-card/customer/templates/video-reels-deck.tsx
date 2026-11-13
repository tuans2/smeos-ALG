"use client"

import { Button } from "@/components/ui/button"
import { useEffect, useRef, useState } from "react"
import { ChevronUp, Info } from "@/components/ui/icons"
import type { GreetingCatalogProduct } from "@/modules/greeting-card/domain/greeting-card-types"
import { EmptyCatalog, HeartToggle, ProductImage, useShortlist } from "./aux/aux-kit"
import { EnterpriseSpecSheet } from "./enterprise-spec-sheet"
import { useEmbeddedPreview } from "./aux/embedded"
import { photoBackdrop } from "./swipe/swipe-card"
import { getSwipeTheme } from "./swipe/swipe-themes"
import { ProductInfo } from "./product-info/product-info"
import { toProductDisplay } from "./product-info/product-display"

const REELS_BACKDROP = photoBackdrop(getSwipeTheme("03"))

interface VideoReelsDeckProps {
  products: GreetingCatalogProduct[]
  catalogName: string
  selectedProductId: string | null
  onSelectProduct: (product: GreetingCatalogProduct) => void
}

/** Reels: lướt dọc toàn màn hình như TikTok/Instagram, mỗi mẫu một khung hình. */
export function VideoReelsDeck({ products, catalogName, onSelectProduct }: VideoReelsDeckProps) {
  const embedded = useEmbeddedPreview()
  const shortlist = useShortlist()
  const [open, setOpen] = useState<GreetingCatalogProduct | null>(null)
  const [active, setActive] = useState(0)
  const scroller = useRef<HTMLDivElement>(null)

  // Theo dõi khung đang hiển thị để cập nhật bộ đếm
  useEffect(() => {
    const root = scroller.current
    if (!root) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index))
      },
      { root, threshold: 0.6 },
    )
    root.querySelectorAll("[data-index]").forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [products.length])

  if (products.length === 0) return <EmptyCatalog />

  return (
    <div className={`relative ${embedded ? "h-full" : "h-dvh"} w-full bg-black text-white`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pb-8 pt-4" style={{ background: "linear-gradient(180deg,rgba(0,0,0,0.55),rgba(0,0,0,0))" }}>
        <h1 className="truncate text-body font-semibold">{catalogName}</h1>
        <span className="text-caption tabular-nums text-white/80">
          {active + 1} / {products.length}
        </span>
      </div>

      <div ref={scroller} className="h-full snap-y snap-mandatory overflow-y-auto [scrollbar-width:none]">
        {products.map((p, i) => (
          <section
            key={p.id}
            data-index={i}
            aria-label={toProductDisplay(p).ariaLabel}
            className={`relative mx-auto ${embedded ? "h-full" : "h-dvh"} w-full max-w-[480px] snap-start snap-always overflow-hidden`}
          >
            <ProductImage product={p} className="absolute inset-0" backdrop={REELS_BACKDROP} />
            <div className="absolute inset-x-0 bottom-0 h-2/3" style={{ background: "linear-gradient(180deg,rgba(0,0,0,0) 0%,rgba(0,0,0,0.5) 50%,rgba(0,0,0,0.9) 100%)" }} />

            <div className="absolute bottom-40 right-3 z-10 flex flex-col items-center gap-5">
              <div className="flex flex-col items-center gap-1">
                <HeartToggle active={shortlist.has(p.id)} onToggle={() => shortlist.toggle(p.id)} name={p.name} className="h-12 w-12" />
                <span className="text-caption font-semibold">Thích</span>
              </div>
              <Button variant="ghost" type="button" onClick={() => setOpen(p)} className="text-[length:inherit] h-auto p-0 font-[inherit] flex flex-col items-center gap-1" aria-label={`Chi tiết ${p.name}`}>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/35 backdrop-blur-md">
                  <Info size={22} aria-hidden="true" />
                </span>
                <span className="text-caption font-semibold">Chi tiết</span>
              </Button>
            </div>

            <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-[max(env(safe-area-inset-bottom),20px)]">
              <ProductInfo product={p} level="standard" size="lg" as="h2" accent="var(--color-warning-bg)" titleClassName="font-bold" className="pr-16" />
              <Button variant="ghost"
                type="button"
                onClick={() => onSelectProduct(p)}
                className="px-0 py-0 gap-0 mt-4 h-12 w-full rounded-2xl bg-white text-body font-bold text-black shadow-lg active:scale-[0.99] hover:bg-white"
              >
                Đặt mẫu này
              </Button>
              {i === 0 && products.length > 1 && (
                <p className="mt-3 flex items-center justify-center gap-1 text-caption text-white/70" aria-hidden="true">
                  <ChevronUp size={14} className="animate-bounce motion-reduce:animate-none" /> Vuốt lên để xem mẫu tiếp
                </p>
              )}
            </div>
          </section>
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
    </div>
  )
}
