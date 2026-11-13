"use client"

import { Button } from "@/components/ui/button"
import { CostPreview } from "@/components/ui/cost-preview"
import { Disclosure } from "@/components/ui/disclosure"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { Copy } from "@/components/ui/icon-set/copy"
import { ExternalLink } from "@/components/ui/icon-set/external-link"
import { Globe } from "@/components/ui/icon-set/globe"
import { Plus } from "@/components/ui/icon-set/plus"
import { fontStack } from "@/modules/brand-kit/domain/logo-svg"
import { readableTextOn } from "@/modules/brand-kit/domain/color-math"
import type { BrandKitView } from "@/modules/brand-kit/use-cases/get-brand-kit"
import { FirstOptionsCard } from "../first-options-card"
import { LANDING_LAYOUT_HINT, confirmPublishLanding } from "../journey/journey-copy"
import type { BrandKitState } from "../use-brand-kit"
import { Tile, TileIcon, TilePill } from "./tile"
import { RefreshBanner } from "../journey/refresh-banner"

type Option = BrandKitView["landing"]["options"][number]


/** Bước 3 trên /cong-cu: trang chính thức đang chạy + ô giao diện để chọn và xuất bản (hỏi trước — R3). */
export function LandingTiles({ kit }: { kit: BrandKitState }) {
  const [confirm, dialog] = useConfirmDialog()
  const view = kit.view!
  const l = view.landing
  const identity = view.identity.options.find((o) => o.selected)?.content ?? null
  const latest = l.options.filter((o) => o.is_latest_batch)
  const older = l.options.filter((o) => !o.is_latest_batch)
  const busy = Boolean(kit.busy)
  const generating = Boolean(kit.busy?.startsWith("landing:") && !kit.busy.includes(":select:"))

  const sections = (
    <section aria-labelledby="bk-sections">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="bk-sections" className="text-title font-extrabold text-text">Trang gồm những phần</h2>
        <span className="text-caption text-text-muted">Cấu trúc riêng cho trang chính thức của cửa hàng</span>
      </div>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {l.sections.map((s) => (
          <li key={s} className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-border/70">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-hidden />
            <span className="text-body-sm font-semibold text-text">{s}</span>
          </li>
        ))}
      </ul>
    </section>
  )

  if (l.options.length === 0) {
    return (
      <div className="space-y-8">
        <FirstOptionsCard
          icon={Globe}
          title="Tạo trang chính thức của cửa hàng"
          description="Trang giới thiệu như một website riêng, đồng bộ màu, logo và khẩu hiệu bạn đã chọn."
          busy={busy}
          generating={generating}
          busyLabel="Đang dựng 3 phương án..."
          onGenerate={() => void kit.generate("landing", "initial")}
        />
        {sections}
      </div>
    )
  }

  const select = async (id: string) => {
    const ok = await confirm(confirmPublishLanding(Boolean(l.published_path)))
    if (ok) await kit.select("landing", id)
  }

  const p = identity?.palette
  const optionTile = (o: Option) => (
    <Tile
      key={o.id}
      title={o.style_label}
      tone={o.selected ? "selected" : "default"}
      className="min-h-0"
      pill={<TilePill tone={o.selected ? "ok" : "muted"}>{o.selected ? "Đang dùng" : "Phương án"}</TilePill>}
      preview={LANDING_LAYOUT_HINT[o.style_key]}
      footer="Trang chính thức"
      footerAction={
        <Button type="button" variant="ghost" size="xs" className="font-bold text-primary" disabled={busy || o.selected} onClick={() => void select(o.id)}>
          {o.selected ? "Đang là trang chính thức" : "Chọn và xuất bản"}
        </Button>
      }
    >
      <div className="relative z-10 my-3 overflow-hidden rounded-xl ring-1 ring-border/70" role="img" aria-label={`Xem trước trang ${o.style_label}`}>
        <div className={`bg-primary px-3 text-center text-surface ${o.style_key === "YOUTHFUL" ? "py-4" : "py-7"}`} style={p ? { backgroundColor: p.primary, color: readableTextOn(p.primary), fontFamily: fontStack(identity!.font_heading) } : undefined}>
          <p className="text-caption uppercase tracking-widest">{view.shop.name}</p>
          <p className="mt-1 text-body font-bold leading-snug">{o.headline}</p>
        </div>
        {o.style_key === "YOUTHFUL" ? (
          <div className="grid grid-cols-3 gap-1 bg-surface-alt p-2">
            {[0, 1, 2].map((i) => <div key={i} className="aspect-square rounded-md" style={{ backgroundColor: i === 1 ? p?.secondary : p?.accent }} />)}
          </div>
        ) : (
          <div className="space-y-1 bg-surface-alt p-3 text-left">
            <p className="text-caption font-bold text-text">{o.story_title}</p>
            <p className="line-clamp-2 text-caption text-text-muted">{o.story_excerpt}</p>
          </div>
        )}
      </div>
    </Tile>
  )

  return (
    <div className="space-y-8">
      {dialog}
      {l.published_path && (
        <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-border/70 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <TileIcon icon={Globe} small />
            <div className="min-w-0">
              <p className="text-body font-bold text-text">Trang chính thức đang hoạt động</p>
              <p className="truncate text-caption text-text-muted">Giờ mở cửa, ảnh, video và sản phẩm chủ đạo tự cập nhật theo Hồ sơ cửa hàng</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void navigator.clipboard?.writeText(`${window.location.origin}${l.published_path}`).catch(() => undefined)}>
              <Copy size={16} aria-hidden /> Sao chép link
            </Button>
            <a href={l.published_path} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-body-sm font-semibold text-surface hover:opacity-90">
              Mở trang <ExternalLink size={16} aria-hidden />
            </a>
          </div>
        </div>
      )}

      <RefreshBanner kind="landing" show={l.profile_changed} canRefresh={l.can_refresh} busy={Boolean(kit.busy)} onRefresh={() => void kit.generate("landing", "refresh")} />

      <section aria-labelledby="bk-landing">
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 id="bk-landing" className="text-title font-extrabold text-text">Chọn giao diện trang</h2>
          <span className="text-caption text-text-muted">Cùng màu, logo và khẩu hiệu của bộ nhận diện đã chọn · đổi giao diện vẫn giữ nguyên link</span>
        </div>
        {kit.busy && <p role="status" className="mb-3 text-body-sm text-text-muted">{generating ? "Đang dựng phương án..." : "Đang xuất bản trang..."}</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          {latest.map(optionTile)}
          <Tile title="Tạo thêm phương án" tone="add" icon={Plus} className="min-h-0" onOpen={l.can_add && !busy ? () => void kit.generate("landing", "extra") : undefined}>
            <CostPreview cost={view.pricing.extra_option_credit} className="mt-1" />
          </Tile>
        </div>
        {older.length > 0 && (
          <Disclosure label={`Phương án trước (${older.length})`} className="mt-3">
            <div className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-2 lg:grid-cols-4">{older.map(optionTile)}</div>
          </Disclosure>
        )}
      </section>

      {sections}
    </div>
  )
}
