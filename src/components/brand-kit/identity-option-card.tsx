"use client"

import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import type { BrandKitView } from "@/modules/brand-kit/use-cases/get-brand-kit"
import { CoverPreview, LogoPreview, MiniBusinessCard, MiniSharePage, PaletteSwatches, type ShopFacts } from "./identity-kit-previews"

type IdentityOptionView = BrandKitView["identity"]["options"][number]

interface IdentityOptionCardProps {
  option: IdentityOptionView
  shop: ShopFacts
  busy: boolean
  onSelect: (id: string) => void
}

/** Một phương án Bộ nhận diện: đủ 6 thành phần để chủ tiệm so sánh trước khi chọn. */
export function IdentityOptionCard({ option, shop, busy, onSelect }: IdentityOptionCardProps) {
  const c = option.content
  return (
    <article
      className={`flex flex-col rounded-2xl bg-surface p-5 shadow-sm transition-all ${option.selected ? "ring-2 ring-primary" : "border border-border"}`}
      aria-label={`Phương án ${option.style_label}`}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-title-sm font-bold text-text">{option.style_label}</h3>
          {option.recommended && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary-muted px-2 py-0.5 text-caption font-semibold text-primary">
              <Sparkles size={12} aria-hidden /> Hợp với hồ sơ nhất
            </span>
          )}
        </div>
        {option.selected && (
          <span className="inline-flex items-center gap-1 text-caption font-semibold text-success-text">
            <CheckCircle2 size={16} aria-hidden /> Đang dùng
          </span>
        )}
      </header>

      <p className="mt-3 text-body font-semibold italic text-text">“{c.slogan}”</p>
      <p className="mt-1 text-caption text-text-muted">{c.rationale}</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <figure className="space-y-1">
          <LogoPreview c={c} shop={shop} />
          <figcaption className="text-caption text-text-muted text-center">Logo</figcaption>
        </figure>
        <figure className="space-y-1">
          <div className="flex aspect-square items-center justify-center rounded-xl bg-surface-alt p-2">
            <MiniSharePage c={c} shop={shop} />
          </div>
          <figcaption className="text-caption text-text-muted text-center">Trang hồ sơ chia sẻ</figcaption>
        </figure>
      </div>

      <figure className="mt-3 space-y-1">
        <MiniBusinessCard c={c} shop={shop} />
        <figcaption className="text-caption text-text-muted text-center">Danh thiếp</figcaption>
      </figure>
      <figure className="mt-3 space-y-1">
        <CoverPreview c={c} shop={shop} />
        <figcaption className="text-caption text-text-muted text-center">Ảnh bìa mạng xã hội</figcaption>
      </figure>

      <div className="mt-4 flex items-center justify-between gap-2">
        <PaletteSwatches c={c} />
        <span className="text-caption text-text-muted">{c.font_heading}</span>
      </div>

      <div className="mt-5 pt-4 border-t border-border">
        <Button
          type="button"
          variant={option.selected ? "outline" : "secondary"}
          className="w-full"
          disabled={busy || option.selected}
          onClick={() => onSelect(option.id)}
        >
          {option.selected ? "Đang là bộ nhận diện chính thức" : "Chọn phương án này"}
        </Button>
      </div>
    </article>
  )
}
