"use client"

import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import type { BrandKitView } from "@/modules/brand-kit/use-cases/get-brand-kit"
import type { IdentityOptionContent } from "@/modules/brand-kit/domain/identity-option"
import { fontStack } from "@/modules/brand-kit/domain/logo-svg"
import { readableTextOn } from "@/modules/brand-kit/domain/color-math"

type LandingOptionView = BrandKitView["landing"]["options"][number]

/** Bố cục khung xem trước theo phong cách trang khách (ảnh lớn / lưới khối / kể chuyện). */
const LAYOUT_HINT: Record<LandingOptionView["style_key"], string> = {
  LUXURY: "Ảnh lớn, nhiều khoảng trắng, chữ có chân",
  YOUTHFUL: "Lưới khối nhiều màu, nút bấm nổi bật",
  RUSTIC: "Tông ấm, kể chuyện tay nghề",
}

interface LandingOptionCardProps {
  option: LandingOptionView
  identity: IdentityOptionContent | null
  shopName: string
  busy: boolean
  onSelect: (id: string) => void
}

/** Một phương án Landing page chính thức — xem trước phần mở đầu và nội dung chính trước khi chọn. */
export function LandingOptionCard({ option, identity, shopName, busy, onSelect }: LandingOptionCardProps) {
  const p = identity?.palette
  const heroStyle = p ? { backgroundColor: p.primary, color: readableTextOn(p.primary), fontFamily: fontStack(identity!.font_heading) } : undefined
  return (
    <article className={`flex flex-col rounded-2xl bg-surface p-5 shadow-sm ${option.selected ? "ring-2 ring-primary" : "border border-border"}`} aria-label={`Phương án ${option.style_label}`}>
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-title-sm font-bold text-text">{option.style_label}</h3>
          <p className="text-caption text-text-muted">{LAYOUT_HINT[option.style_key]}</p>
        </div>
        {option.selected && (
          <span className="inline-flex items-center gap-1 text-caption font-semibold text-success-text"><CheckCircle2 size={16} aria-hidden /> Đang dùng</span>
        )}
      </header>

      <div className="mt-4 overflow-hidden rounded-xl border border-border" role="img" aria-label={`Xem trước trang ${option.style_label}`}>
        <div className={`px-4 ${option.style_key === "YOUTHFUL" ? "py-5" : "py-8"} text-center bg-primary text-surface`} style={heroStyle}>
          <p className="text-caption uppercase tracking-widest">{shopName}</p>
          <p className="mt-1 text-title-sm font-bold leading-snug">{option.headline}</p>
          <p className="mt-1 text-caption line-clamp-2">{option.sub_headline}</p>
        </div>
        {option.style_key === "YOUTHFUL" ? (
          <div className="grid grid-cols-3 gap-1 p-2 bg-surface-alt">
            {[0, 1, 2].map((i) => <div key={i} className="aspect-square rounded-md" style={{ backgroundColor: i === 1 ? p?.secondary : p?.accent }} />)}
          </div>
        ) : (
          <div className="space-y-1 p-3 bg-surface-alt text-left">
            <p className="text-caption font-bold text-text">{option.story_title}</p>
            <p className="text-caption text-text-muted line-clamp-3">{option.story_excerpt}</p>
          </div>
        )}
      </div>

      {option.perks.length > 0 && (
        <ul className="mt-3 space-y-1">
          {option.perks.map((t) => <li key={t} className="text-caption text-text">• {t}</li>)}
        </ul>
      )}

      <div className="mt-auto pt-4">
        <Button type="button" variant={option.selected ? "outline" : "secondary"} className="w-full" disabled={busy || option.selected} onClick={() => onSelect(option.id)}>
          {option.selected ? "Đang là trang chính thức" : "Chọn và xuất bản"}
        </Button>
      </div>
    </article>
  )
}
