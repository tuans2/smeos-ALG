"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Heart, MessageCircle, Palette, RefreshCw, RotateCcw, Tags } from "@/components/ui/icons"
import type { GreetingCatalogProduct } from "@/modules/greeting-card/domain/greeting-card-types"
import { photoBackdrop } from "./swipe-card"
import { ProductInfo } from "../product-info/product-info"
import { ProductImage } from "../aux/aux-kit"
import { SWIPE_SIGNAL, isLightTheme, type SwipeTheme } from "./swipe-themes"

interface SwipeDeckEndProps {
  theme: SwipeTheme
  liked: GreetingCatalogProduct[]
  total: number
  onOrder: (product: GreetingCatalogProduct) => void
  onRestart: () => void
  /** Quay lại mẫu cuối, giữ nguyên tim đã thả */
  onRewind: () => void
  /** Khoảng giá có mẫu — khách chưa ưng mẫu nào thì cho lọc theo giá */
  priceRanges?: ReadonlyArray<{ key: string; label: string; count: number }> | undefined
  onPickPriceRange?: ((key: string) => void) | undefined
  /** Có khi trang có ngữ cảnh liên hệ tiệm (link riêng của khách) */
  onAskZalo?: (() => void) | undefined
  onCustomDesign?: (() => void) | undefined
}

/**
 * Màn hình khi đã lướt hết: danh sách mẫu đã thích để đặt ngay. Chưa thích mẫu nào thì KHÔNG
 * kết thúc ở đây — mời xem thêm, lọc theo giá, nhắn Zalo hoặc yêu cầu thiết kế riêng.
 */
export function SwipeDeckEnd({
  theme, liked, total, onOrder, onRestart, onRewind, priceRanges = [], onPickPriceRange, onAskZalo, onCustomDesign,
}: SwipeDeckEndProps) {
  const [pickingPrice, setPickingPrice] = useState(false)
  const light = isLightTheme(theme)
  const panel = light ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.06)"
  const line = light ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.12)"

  return (
    <section aria-labelledby="deck-end-title" className="flex flex-1 flex-col gap-4 py-2">
      <div className="text-center">
        <span
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: panel, color: SWIPE_SIGNAL.like }}
        >
          <Heart size={26} fill="currentColor" aria-hidden="true" />
        </span>
        <h2 id="deck-end-title" className="mt-3 text-title font-semibold" style={{ fontFamily: theme.font }}>
          {liked.length > 0 ? `Bạn đã thích ${liked.length} mẫu` : "Bạn đã xem hết bộ sưu tập"}
        </h2>
        <p className="mt-1 text-body-sm" style={{ color: theme.stageMuted }}>
          {liked.length > 0
            ? "Chọn một mẫu để đặt hoa, hoặc xem lại từ đầu."
            : `Chưa có mẫu nào trong ${total} mẫu khiến bạn ưng? Cửa hàng còn nhiều cách giúp bạn:`}
        </p>
      </div>

      {liked.length > 0 && (
        <ul className="flex flex-col gap-2.5 overflow-y-auto">
          {liked.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-2xl border p-2.5" style={{ background: panel, borderColor: line }}>
              <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                <ProductImage product={p} backdrop={photoBackdrop(theme)} />
              </span>
              <ProductInfo product={p} level="compact" size="sm" accent={light ? theme.ctaBg : theme.accent} titleClassName="font-semibold" className="flex-1" />
              <Button variant="ghost"
                type="button"
                onClick={() => onOrder(p)}
                className="py-0 gap-0 h-11 shrink-0 rounded-xl px-4 text-body-sm font-bold"
                style={{ background: theme.ctaBg, color: theme.ctaText }}
              >
                Đặt mẫu
              </Button>
            </li>
          ))}
        </ul>
      )}

      {liked.length === 0 && (
        <div className="flex flex-col gap-2">
          <EndOption label="Xem thêm mẫu" icon={RefreshCw} line={line} panel={panel} onClick={onRestart} />
          {priceRanges.length > 1 && onPickPriceRange && (
            <EndOption label="Chọn theo khoảng giá" icon={Tags} line={line} panel={panel} onClick={() => setPickingPrice((v) => !v)} />
          )}
          {pickingPrice && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Khoảng giá">
              {priceRanges.map((r) => (
                <Button variant="outline"
                  key={r.key}
                  type="button"
                  onClick={() => onPickPriceRange?.(r.key)}
                  className="py-0 gap-0 h-10 rounded-full border px-3 text-body-sm font-semibold"
                  style={{ borderColor: line, background: panel }}
                >
                  {r.label} · {r.count}
                </Button>
              ))}
            </div>
          )}
          {onAskZalo && <EndOption label="Nhắn Zalo cho cửa hàng" icon={MessageCircle} line={line} panel={panel} onClick={onAskZalo} />}
          {onCustomDesign && <EndOption label="Yêu cầu thiết kế riêng" icon={Palette} line={line} panel={panel} onClick={onCustomDesign} />}
        </div>
      )}

      <div className="mt-auto grid grid-cols-2 gap-2">
        <Button variant="outline"
          type="button"
          onClick={onRewind}
          className="px-0 py-0 flex h-12 items-center justify-center gap-2 rounded-2xl border text-body-sm font-semibold"
          style={{ borderColor: line }}
        >
          <RotateCcw size={16} aria-hidden="true" />
          Quay lại mẫu cuối
        </Button>
        <Button variant="outline"
          type="button"
          onClick={onRestart}
          className="px-0 py-0 flex h-12 items-center justify-center gap-2 rounded-2xl border text-body-sm font-semibold"
          style={{ borderColor: line }}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Xem lại từ đầu
        </Button>
      </div>
    </section>
  )
}

function EndOption(props: { label: string; icon: typeof Heart; line: string; panel: string; onClick: () => void }) {
  const Icon = props.icon
  return (
    <Button variant="outline"
      type="button"
      onClick={props.onClick}
      className="py-0 flex h-12 items-center gap-3 rounded-2xl border px-4 text-body-sm font-semibold"
      style={{ borderColor: props.line, background: props.panel }}
    >
      <Icon size={18} aria-hidden="true" />
      {props.label}
    </Button>
  )
}
