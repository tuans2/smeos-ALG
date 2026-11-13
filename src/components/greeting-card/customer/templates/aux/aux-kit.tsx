"use client"

import { Button } from "@/components/ui/button"
import { useState, type ReactNode } from "react"
import { Heart } from "@/components/ui/icons"
import type { GreetingCatalogProduct } from "@/modules/greeting-card/domain/greeting-card-types"
import { cn } from "@/lib/utils"
import { driveThumbProxySrc } from "@/components/greeting-card/drive-thumb-image"
import { formatVnd, toProductDisplay } from "../product-info/product-display"
import { ProductInfo } from "../product-info/product-info"
import { rootHeight, useEmbeddedPreview } from "./embedded"

export { formatVnd }

/** Danh sách mẫu khách đã thả tim (chỉ trong phiên xem). */
export function useShortlist() {
  const [ids, setIds] = useState<string[]>([])
  return {
    ids,
    has: (id: string) => ids.includes(id),
    toggle: (id: string) => setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
  }
}

interface AuxPageProps {
  eyebrow?: string
  title: string
  subtitle?: string
  children: ReactNode
  /** Thanh cố định phía dưới (nút đặt hoa) */
  bottom?: ReactNode
  className?: string
}

export function AuxPage({ eyebrow, title, subtitle, children, bottom, className }: AuxPageProps) {
  const embedded = useEmbeddedPreview()
  return (
    <div className={cn(rootHeight(embedded), "w-full bg-bg text-text", className)}>
      <div className={cn("mx-auto w-full max-w-[480px] px-4 pt-6", bottom ? "pb-28" : "pb-10")}>
        <header className="mb-5">
          {eyebrow && <p className="text-caption font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>}
          <h1 className="mt-1 font-serif text-display font-medium leading-tight tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 text-body-sm text-text-muted">{subtitle}</p>}
        </header>
        {children}
      </div>
      {bottom && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur-md">
          <div className="mx-auto w-full max-w-[480px] px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3">{bottom}</div>
        </div>
      )}
    </div>
  )
}

export function EmptyCatalog() {
  const embedded = useEmbeddedPreview()
  return (
    <div className={`flex ${rootHeight(embedded)} items-center justify-center bg-bg p-6 text-center`}>
      <p className="text-body text-text-muted">Bộ sưu tập này chưa có sản phẩm nào.</p>
    </div>
  )
}

/**
 * Ảnh sản phẩm hòa nền: nhân (multiply) lên `backdrop` để nền trắng của ảnh studio
 * tan vào màu khung, không lộ thành khối chữ nhật. Ảnh có bối cảnh thật gần như không đổi.
 * Luôn `object-contain`: khách phải thấy trọn sản phẩm, không bị cắt mép.
 */

export function ProductImage({
  product,
  className,
  backdrop = "radial-gradient(90% 70% at 50% 40%, var(--color-surface) 0%, var(--color-surface-alt) 100%)",
}: {
  product: GreetingCatalogProduct
  className?: string
  backdrop?: string
}) {
  const [driveFailed, setDriveFailed] = useState(false)
  const driveProxySrc = !product.imageUrl && !driveFailed ? driveThumbProxySrc(product.driveLink) : null

  if (product.imageUrl) {
    return (
      <span className={cn("block h-full w-full overflow-hidden", className?.includes("absolute") ? undefined : "relative", className)} style={{ background: backdrop }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.imageUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-contain" style={{ mixBlendMode: "multiply" }} />
      </span>
    )
  }

  if (driveProxySrc) {
    return (
      <span className={cn("block h-full w-full overflow-hidden", className?.includes("absolute") ? undefined : "relative", className)} style={{ background: backdrop }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={driveProxySrc}
          alt=""
          loading="lazy"
          onError={() => setDriveFailed(true)}
          className="absolute inset-0 h-full w-full object-contain"
          style={{ mixBlendMode: "multiply" }}
        />
      </span>
    )
  }

  return (
    <div className={cn("flex h-full w-full items-center justify-center bg-surface-alt text-caption text-text-muted", className)}>
      Chưa có ảnh
    </div>
  )
}

export function HeartToggle({ active, onToggle, name, className }: { active: boolean; onToggle: () => void; name: string; className?: string }) {
  return (
    <Button variant="ghost"
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      aria-pressed={active}
      aria-label={active ? `Bỏ thích ${name}` : `Thích ${name}`}
      className={cn("font-[inherit] gap-0", 
        "flex h-10 w-10 items-center justify-center rounded-full shadow-sm backdrop-blur-md transition-transform active:scale-90",
        active ? "bg-white text-danger" : "bg-black/35 text-white",
        className,
      )}
    >
      <Heart size={18} fill={active ? "currentColor" : "none"} aria-hidden="true" />
    </Button>
  )
}

interface ProductTileProps {
  product: GreetingCatalogProduct
  liked: boolean
  onLike: () => void
  onOpen: () => void
  selected?: boolean
  aspect?: string
}

/** Ô sản phẩm kiểu cửa hàng thời trang: ảnh lớn, tên 2 dòng, giá rõ. */
export function ProductTile({ product, liked, onLike, onOpen, selected, aspect = "aspect-[4/5]" }: ProductTileProps) {
  return (
    <div className="group relative">
      <Button variant="ghost" type="button" onClick={onOpen} className="text-[length:inherit] h-auto p-0 justify-start font-[inherit] gap-0 block w-full text-left" aria-label={`Xem ${toProductDisplay(product).ariaLabel}`}>
        <div className={cn("relative w-full overflow-hidden rounded-2xl bg-surface-alt", aspect, selected && "ring-2 ring-primary ring-offset-2 ring-offset-bg")}>
          <ProductImage product={product} className="transition-transform duration-500 group-hover:scale-[1.04]" />
        </div>
        <ProductInfo product={product} level="compact" size="sm" titleClassName="font-medium" className="mt-2" />
      </Button>
      <HeartToggle active={liked} onToggle={onLike} name={product.name} className="absolute right-2 top-2" />
    </div>
  )
}

/** Thanh đặt hoa cố định: tên mẫu đang chọn + giá + nút đặt. */
export function OrderBar({ product, onOrder, hint }: { product: GreetingCatalogProduct | null; onOrder: (p: GreetingCatalogProduct) => void; hint?: string }) {
  if (!product) {
    return <p className="py-3 text-center text-body-sm text-text-muted">{hint ?? "Chọn một sản phẩm để đặt"}</p>
  }
  return (
    <div className="flex items-center gap-3">
      <ProductInfo product={product} level="compact" size="sm" titleLines={1} titleClassName="font-semibold" className="flex-1" />
      <Button variant="primary"
        type="button"
        onClick={() => onOrder(product)}
        className="py-0 gap-0 h-12 shrink-0 rounded-2xl bg-primary px-6 text-body font-bold text-white shadow-md transition-transform active:scale-[0.98] hover:bg-primary"
      >
        Đặt mẫu này
      </Button>
    </div>
  )
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Button variant="outline"
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-body-sm font-semibold transition-colors",
        active ? "border-text bg-text text-surface" : "border-border bg-surface text-text hover:border-text/40",
      )}
    >
      {children}
    </Button>
  )
}
