"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CostPreview } from "@/components/ui/cost-preview"
import { Dialog } from "@/components/ui/dialog"
import { Disclosure } from "@/components/ui/disclosure"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { Check } from "@/components/ui/icon-set/check"
import { Copy } from "@/components/ui/icon-set/copy"
import { Download } from "@/components/ui/icon-set/download"
import { Palette } from "@/components/ui/icon-set/palette"
import { Plus } from "@/components/ui/icon-set/plus"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { StoreShareLinkCard } from "@/components/profiles/store-share-link-card"
import type { TenantProfileState } from "@/lib/hooks/use-tenant-profile"
import { SOCIAL_COVER_SIZE } from "@/modules/brand-kit/domain/social-cover-svg"
import { evaluateStoreProfile } from "@/modules/profiles/domain/store-profile-completeness"
import type { BrandKitView } from "@/modules/brand-kit/use-cases/get-brand-kit"
import { FirstOptionsCard } from "../first-options-card"
import { CoverPreview, LogoPreview, MiniBusinessCard, MiniSharePage, PaletteSwatches, coverSvgFor, logoSvgFor, type ShopFacts } from "../identity-kit-previews"
import { downloadPng, downloadSvg, fileSlug } from "../svg-file"
import type { BrandKitState } from "../use-brand-kit"
import { Tile, TilePill } from "./tile"

type Option = BrandKitView["identity"]["options"][number]

const copy = (text: string) => void navigator.clipboard?.writeText(text).catch(() => undefined)

/** Bước 2 trên /cong-cu: chọn phong cách (ô), xem 6 thành phần của phong cách đang xem, dùng làm chính thức. */
export function IdentityTiles({ kit, profile }: { kit: BrandKitState; profile: TenantProfileState }) {
  const [confirm, dialog] = useConfirmDialog()
  const [shareOpen, setShareOpen] = useState(false)
  const view = kit.view!
  const id = view.identity
  const latest = id.options.filter((o) => o.is_latest_batch)
  const older = id.options.filter((o) => !o.is_latest_batch)
  const selected = id.options.find((o) => o.selected) ?? null
  const [viewingId, setViewingId] = useState<string | null>(null)
  const viewing: Option | null =
    id.options.find((o) => o.id === viewingId) ?? selected ?? latest.find((o) => o.recommended) ?? latest[0] ?? null
  const shop: ShopFacts = { name: view.shop.name, phone: view.shop.phone, address: view.shop.address, email: view.shop.email, logoUrl: view.shop.logo_url }
  const busy = Boolean(kit.busy)
  const generating = Boolean(kit.busy?.startsWith("identity:") && !kit.busy.includes(":select:"))

  if (id.options.length === 0 || !viewing) {
    return (
      <FirstOptionsCard
        icon={Palette}
        title="Tạo Bộ nhận diện từ hồ sơ"
        description="Hệ thống đọc Hồ sơ cửa hàng và đưa ra 3 phong cách: logo, khẩu hiệu, bộ màu, danh thiếp, trang hồ sơ chia sẻ và ảnh bìa mạng xã hội."
        busy={busy}
        generating={generating}
        busyLabel="Đang tạo 3 phương án..."
        onGenerate={() => void kit.generate("identity", "initial")}
      />
    )
  }

  const applyViewing = async () => {
    if (selected) {
      const ok = await confirm({
        title: "Đổi bộ nhận diện chính thức?",
        consequence: "Màu, phông chữ, khẩu hiệu và logo của cửa hàng sẽ đổi theo phương án mới ở mọi nơi: danh thiếp, trang chia sẻ, Landing page và Cài đặt. Bạn có thể chọn lại phương án cũ bất cứ lúc nào.",
        confirmLabel: "Đổi bộ nhận diện",
      })
      if (!ok) return
    }
    if (await kit.select("identity", viewing.id)) await profile.reload()
  }

  const styleTile = (o: Option) => (
    <Tile
      key={o.id}
      title={o.style_label}
      tone={o.id === viewing.id ? "selected" : "default"}
      className="min-h-0"
      onOpen={() => setViewingId(o.id)}
      pill={
        <div className="flex flex-wrap gap-1.5">
          <TilePill tone={o.selected ? "ok" : o.id === viewing.id ? "primary" : "muted"}>{o.selected ? "Đang dùng" : o.id === viewing.id ? "Đang xem" : "Phong cách"}</TilePill>
          {o.recommended && <TilePill tone="primary"><Sparkles size={12} aria-hidden /> Hợp hồ sơ nhất</TilePill>}
        </div>
      }
      preview={<span className="italic">“{o.content.slogan}”</span>}
    >
      <div className="mt-3 flex items-center gap-3">
        <div className="w-14"><LogoPreview c={o.content} shop={shop} /></div>
        <PaletteSwatches c={o.content} />
      </div>
    </Tile>
  )

  const c = viewing.content
  const isOfficial = viewing.selected
  const comp = (title: string, fmt: string, preview: React.ReactNode, action?: React.ReactNode) => (
    <Tile key={title} title={title} className="min-h-0" pill={<TilePill tone="ok">Tự động tạo</TilePill>} footer={fmt} footerAction={action}>
      <div className="my-3 flex h-32 items-center justify-center overflow-hidden rounded-xl bg-surface-alt">{preview}</div>
    </Tile>
  )
  const act = (label: string, icon: React.ReactNode, onClick: () => void) => (
    <Button type="button" variant="ghost" size="xs" className="gap-1 font-bold text-primary" onClick={onClick}>{icon}{label}</Button>
  )

  return (
    <div className="space-y-8">
      {dialog}
      {id.profile_changed && id.can_refresh && (
        <div role="status" className="flex flex-col gap-3 rounded-2xl border border-warning-border bg-warning-bg p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-body-sm text-warning-text">Hồ sơ cửa hàng đã thay đổi sau lần tạo gần nhất.</p>
          <Button type="button" variant="outline" size="sm" className="shrink-0 gap-2" disabled={busy} onClick={() => void kit.generate("identity", "refresh")}>
            <RefreshCw size={16} aria-hidden /> Tạo lại theo hồ sơ mới (miễn phí)
          </Button>
        </div>
      )}

      <section aria-labelledby="bk-styles">
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 id="bk-styles" className="text-title font-extrabold text-text">Chọn phong cách</h2>
          <span className="text-caption text-text-muted">Hệ thống tạo từ Hồ sơ cửa hàng · 3 phương án đầu miễn phí</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          {latest.map(styleTile)}
          <Tile title="Tạo thêm phương án" tone="add" icon={Plus} className="min-h-0" onOpen={id.can_add && !busy ? () => void kit.generate("identity", "extra") : undefined}>
            <CostPreview cost={view.pricing.extra_option_credit} className="mt-1" />
          </Tile>
        </div>
        {older.length > 0 && (
          <Disclosure label={`Phương án trước (${older.length})`} className="mt-3">
            <div className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-2 lg:grid-cols-4">{older.map(styleTile)}</div>
          </Disclosure>
        )}
      </section>

      <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-border/70 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="text-body font-bold text-text">Bộ nhận diện — {viewing.style_label}</p>
          <p className="text-caption text-text-muted">{isOfficial ? "Đang là bộ chính thức, đã áp dụng cho danh thiếp, trang chia sẻ và Cài đặt." : c.rationale}</p>
        </div>
        <Button type="button" className="shrink-0 gap-2" disabled={busy || isOfficial} onClick={() => void applyViewing()}>
          <Check size={16} aria-hidden /> {isOfficial ? "Đang là bộ chính thức" : kit.busy?.includes(":select:") ? "Đang áp dụng..." : "Dùng bộ này làm chính thức"}
        </Button>
      </div>
      {kit.busy && <p role="status" className="-mt-5 text-body-sm text-text-muted">{generating ? "Đang tạo phương án..." : "Đang áp dụng bộ nhận diện..."}</p>}

      <section aria-label="Thành phần bộ nhận diện" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
        {comp("Logo", "SVG", <div className="h-28 w-28"><LogoPreview c={c} shop={shop} /></div>,
          act("Tải", <Download size={14} aria-hidden />, () => downloadSvg(logoSvgFor(c, shop.name), `logo-${fileSlug(shop.name)}.svg`)))}
        {comp("Khẩu hiệu", "Văn bản", <p className="px-4 text-center text-title font-bold text-primary">“{c.slogan}”</p>,
          act("Sao chép", <Copy size={14} aria-hidden />, () => copy(c.slogan)))}
        {comp("Bộ màu", "5 mã màu", <PaletteSwatches c={c} />,
          act("Sao chép", <Copy size={14} aria-hidden />, () => copy(Object.values(c.palette).join(", "))))}
        {comp("Danh thiếp", isOfficial ? "PDF · PNG · danh bạ" : "Xem trước", <div className="w-4/5"><MiniBusinessCard c={c} shop={shop} /></div>,
          isOfficial ? <Link href="/ho-so/danh-thiep" className="font-bold text-primary hover:underline">Mở để tải</Link> : undefined)}
        {comp("Trang hồ sơ chia sẻ", isOfficial ? "Đường dẫn" : "Xem trước", <MiniSharePage c={c} shop={shop} />,
          isOfficial ? act("Lấy link", null, () => setShareOpen(true)) : undefined)}
        {comp("Ảnh bìa mạng xã hội", `PNG ${SOCIAL_COVER_SIZE.width}×${SOCIAL_COVER_SIZE.height}`, <CoverPreview c={c} shop={shop} />,
          act("Tải", <Download size={14} aria-hidden />, () => void downloadPng(coverSvgFor(c, shop), SOCIAL_COVER_SIZE.width, SOCIAL_COVER_SIZE.height, `anh-bia-${fileSlug(shop.name)}.png`)))}
      </section>

      {shareOpen && (
        <Dialog open onOpenChange={(o) => !o && setShareOpen(false)} title="Trang hồ sơ chia sẻ" size="lg">
          <StoreShareLinkCard
            readyToShare={evaluateStoreProfile({ business: profile.business, brand: profile.brand }).readyToShare}
            missingEssentials={evaluateStoreProfile({ business: profile.business, brand: profile.brand }).missing.filter((m) => m.essential).map((m) => m.label)}
          />
        </Dialog>
      )}
    </div>
  )
}
