"use client"

import { Button } from "@/components/ui/button"
import { Info } from "@/components/ui/icons"
import type { GreetingCatalogProduct } from "@/modules/greeting-card/domain/greeting-card-types"
import type { SwipeTheme } from "./swipe-themes"
import { driveThumbProxySrc } from "@/components/greeting-card/drive-thumb-image"
import { ProductInfo } from "../product-info/product-info"
import { formatVnd } from "../product-info/product-display"
import { toProductDisplay } from "../product-info/product-display"

export { formatVnd }

/**
 * Nền phía sau ảnh: chủ đề sáng dùng màu giấy (nền trắng của ảnh thành màu giấy, liền với
 * vùng chữ); chủ đề tối dùng vùng sáng giữa khung tắt dần về màu thẻ như ánh đèn studio.
 */
export function photoBackdrop(theme: SwipeTheme): string {
  if (theme.info === "paper" || theme.info === "polaroid") {
    return `radial-gradient(90% 70% at 50% 40%, #ffffff 0%, ${theme.infoBg} 70%)`
  }
  return `radial-gradient(110% 80% at 50% 38%, #ffffff 0%, #f3efe9 34%, ${theme.card} 100%)`
}

interface SwipeCardProps {
  product: GreetingCatalogProduct
  theme: SwipeTheme
  /** Tên hiển thị góc trên (chỉ dùng ở ô xem trước, nơi không có tiêu đề trang) */
  brand?: string | undefined
  index: number
  total: number
  onInfo?: (() => void) | undefined
}

function ProgressBars({ index, total, light }: { index: number; total: number; light: boolean }) {
  const shown = Math.min(total, 12)
  const active = total > 12 ? Math.round((index / (total - 1)) * (shown - 1)) : index
  return (
    <div className="absolute inset-x-3 top-3 z-10 flex gap-1" aria-hidden="true">
      {/* Như Facebook Story: vạch đã xem và đang xem tô đầy, vạch chưa xem mờ */}
      {Array.from({ length: shown }, (_, i) => (
        <span
          key={i}
          className="h-1 flex-1 rounded-full"
          style={{ background: i <= active ? (light ? "rgba(24,24,27,0.85)" : "#fff") : light ? "rgba(24,24,27,0.15)" : "rgba(255,255,255,0.35)" }}
        />
      ))}
    </div>
  )
}

export function SwipeCard({ product, theme, brand, index, total, onInfo }: SwipeCardProps) {
  const paper = theme.info === "paper" || theme.info === "polaroid"
  const polaroid = theme.info === "polaroid"

  const serif = theme.font.includes("serif") && !theme.font.includes("sans")
  const fontSize = polaroid ? 30 : theme.titleUpper ? 20 : serif ? 26 : 22
  const infoButton = onInfo && (
    <Button variant="outline"
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onInfo}
      aria-label={`Xem chi tiết ${product.name}`}
      className="px-0 py-0 text-[length:inherit] font-[inherit] gap-0 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-current/30 backdrop-blur-sm transition-transform active:scale-90"
    >
      <Info size={18} aria-hidden="true" />
    </Button>
  )
  const info = (
    <ProductInfo
      product={product}
      level="standard"
      eyebrow={theme.eyebrow}
      accent={theme.accent}
      muted={paper ? theme.muted : undefined}
      titleClassName={theme.titleUpper ? "uppercase tracking-[0.08em]" : undefined}
      titleStyle={{ fontFamily: theme.font, fontWeight: theme.titleWeight, fontSize }}
      trailing={infoButton}
    />
  )

  return (
    <article
      aria-label={`${toProductDisplay(product).ariaLabel}, mẫu ${index + 1} trên ${total}`}
      className="relative flex h-full w-full select-none flex-col overflow-hidden"
      style={{ borderRadius: theme.radius, background: theme.card, boxShadow: "0 18px 50px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.12)" }}
    >
      <div className={`relative min-h-0 flex-1 overflow-hidden ${polaroid ? "m-3 mb-0 rounded-sm" : ""}`}>
        {product.imageUrl ? (
          <>
            {/* Nền hòa ảnh: ảnh nền trắng được nhân (multiply) lên nền chủ đề, nên phần trắng
                tan vào khung thay vì lộ thành một khối chữ nhật. Ảnh có bối cảnh thật gần như không đổi. */}
            <div aria-hidden="true" className="absolute inset-0" style={{ background: photoBackdrop(theme) }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.imageUrl}
              alt=""
              draggable={false}
              className="absolute inset-0 h-full w-full object-contain"
              style={{ objectPosition: "50% 35%", filter: theme.photoFilter, mixBlendMode: "multiply" }}
            />
          </>
        ) : driveThumbProxySrc(product.driveLink) ? (
          <>
            <div aria-hidden="true" className="absolute inset-0" style={{ background: photoBackdrop(theme) }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={driveThumbProxySrc(product.driveLink)!}
              alt=""
              draggable={false}
              className="absolute inset-0 h-full w-full object-contain"
              style={{ objectPosition: "50% 35%", filter: theme.photoFilter, mixBlendMode: "multiply" }}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-body-sm opacity-60" style={{ color: theme.muted }}>
            Chưa có ảnh sản phẩm
          </div>
        )}
        {theme.tape && (
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-0 z-10 h-6 w-24 -translate-x-1/2 -rotate-2"
            style={{ background: "rgba(250,240,210,0.75)", boxShadow: "0 1px 2px rgba(0,0,0,0.12)" }}
          />
        )}
        {theme.innerFrame && (
          <div className="pointer-events-none absolute inset-3" style={{ border: theme.innerFrame, borderRadius: Math.max(0, theme.radius - 10) }} />
        )}
        {!paper && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5"
            style={{ background: "linear-gradient(180deg,rgba(0,0,0,0) 0%,rgba(0,0,0,0.35) 45%,rgba(0,0,0,0.85) 100%)" }}
          />
        )}
        {!paper && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24" style={{ background: "linear-gradient(180deg,rgba(0,0,0,0.28),rgba(0,0,0,0))" }} />
        )}
        <ProgressBars index={index} total={total} light={paper} />
        {brand && (
          <p className="absolute left-4 top-6 z-10 max-w-[70%] truncate text-caption font-semibold uppercase tracking-[0.2em] text-white/90">
            {brand}
          </p>
        )}

        {!paper && (
          <div className="absolute inset-x-0 bottom-0 z-10 p-5" style={{ color: theme.text }}>
            <div
              className={theme.info === "glass" ? "rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl" : ""}
            >
              {info}
            </div>
          </div>
        )}
      </div>

      {paper && (
        <div className="shrink-0 px-5 pb-5 pt-4" style={{ background: theme.infoBg, color: theme.text }}>
          {info}
        </div>
      )}
    </article>
  )
}
