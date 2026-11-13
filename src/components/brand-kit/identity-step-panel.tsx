"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CostPreview } from "@/components/ui/cost-preview"
import { Disclosure } from "@/components/ui/disclosure"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { ArrowRight } from "@/components/ui/icon-set/arrow-right"
import { Download } from "@/components/ui/icon-set/download"
import { Palette } from "@/components/ui/icon-set/palette"
import { StoreShareLinkCard } from "@/components/profiles/store-share-link-card"
import { SOCIAL_COVER_SIZE } from "@/modules/brand-kit/domain/social-cover-svg"
import type { TenantProfileState } from "@/lib/hooks/use-tenant-profile"
import type { BrandKitState } from "./use-brand-kit"
import { IdentityOptionCard } from "./identity-option-card"
import { FirstOptionsCard } from "./first-options-card"
import { CONFIRM_CHANGE_IDENTITY, shareReadiness } from "./journey/journey-copy"
import { coverSvgFor, logoSvgFor, type ShopFacts } from "./identity-kit-previews"
import { downloadPng, downloadSvg, fileSlug } from "./svg-file"
import { RefreshBanner } from "./journey/refresh-banner"

interface IdentityStepPanelProps {
  kit: BrandKitState
  profile: TenantProfileState
  onNext: () => void
}

/** Bước 2 — Bộ nhận diện: hệ thống tự sinh 3 phương án từ Hồ sơ, chủ tiệm chọn 1 làm bộ chính thức. */
export function IdentityStepPanel({ kit, profile, onNext }: IdentityStepPanelProps) {
  const [confirm, dialog] = useConfirmDialog()
  const view = kit.view!
  const id = view.identity
  const shop: ShopFacts = { name: view.shop.name, phone: view.shop.phone, address: view.shop.address, email: view.shop.email, logoUrl: view.shop.logo_url }
  const latest = id.options.filter((o) => o.is_latest_batch)
  const older = id.options.filter((o) => !o.is_latest_batch)
  const selected = id.options.find((o) => o.selected) ?? null
  const generating = kit.busy?.startsWith("identity:") && !kit.busy.includes(":select:")

  const select = async (optionId: string) => {
    if (selected) {
      const ok = await confirm(CONFIRM_CHANGE_IDENTITY)
      if (!ok) return
    }
    if (await kit.select("identity", optionId)) await profile.reload()
  }

  if (id.options.length === 0) {
    return (
      <FirstOptionsCard
        icon={Palette}
        title="Tạo Bộ nhận diện từ hồ sơ"
        description="Hệ thống đọc Hồ sơ cửa hàng và đưa ra 3 phong cách: logo, khẩu hiệu, bộ màu, danh thiếp, trang hồ sơ chia sẻ và ảnh bìa mạng xã hội."
        busy={Boolean(kit.busy)}
        generating={Boolean(generating)}
        busyLabel="Đang tạo 3 phương án..."
        onGenerate={() => void kit.generate("identity", "initial")}
      />
    )
  }

  return (
    <div className="space-y-6">
      {dialog}
      <RefreshBanner kind="identity" show={id.profile_changed} canRefresh={id.can_refresh} busy={Boolean(kit.busy)} onRefresh={() => void kit.generate("identity", "refresh")} />

      {selected && (
        <section className="rounded-2xl bg-surface shadow-sm p-5 sm:p-6 space-y-4" aria-labelledby="identity-official-title">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 id="identity-official-title" className="text-title-sm font-bold text-text">Bộ nhận diện đang dùng: {selected.style_label}</h2>
              <p className="text-caption text-text-muted mt-1">Đã áp dụng cho danh thiếp, trang chia sẻ và Landing page.</p>
            </div>
            <Button type="button" onClick={onNext} disabled={Boolean(kit.busy)} className="gap-2 shrink-0">{view.landing.options.length ? "Xem Landing page" : "Tạo Landing page"} <ArrowRight size={16} aria-hidden /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => downloadSvg(logoSvgFor(selected.content, shop.name), `logo-${fileSlug(shop.name)}.svg`)}>
              <Download size={16} aria-hidden /> Logo (SVG)
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void downloadPng(coverSvgFor(selected.content, shop), SOCIAL_COVER_SIZE.width, SOCIAL_COVER_SIZE.height, `anh-bia-${fileSlug(shop.name)}.png`)}>
              <Download size={16} aria-hidden /> Ảnh bìa (PNG)
            </Button>
            <Link href="/ho-so/danh-thiep" className="inline-flex items-center min-h-11 px-4 rounded-lg text-body-sm font-semibold text-primary hover:bg-primary/10">Mở danh thiếp</Link>
          </div>
          <StoreShareLinkCard {...shareReadiness(profile)} />
        </section>
      )}

      {kit.busy && <p role="status" className="text-body-sm text-text-muted">{generating ? "Đang tạo phương án..." : "Đang áp dụng bộ nhận diện..."}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {latest.map((o) => (
          <IdentityOptionCard key={o.id} option={o} shop={shop} busy={Boolean(kit.busy)} onSelect={(oid) => void select(oid)} />
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2">
        <CostPreview cost={view.pricing.extra_option_credit} />
        <Button type="button" variant="outline" disabled={Boolean(kit.busy) || !id.can_add} onClick={() => void kit.generate("identity", "extra")}>
          Tạo thêm phương án
        </Button>
      </div>

      {older.length > 0 && (
        <Disclosure label={`Phương án trước (${older.length})`}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-3">
            {older.map((o) => (
              <IdentityOptionCard key={o.id} option={o} shop={shop} busy={Boolean(kit.busy)} onSelect={(oid) => void select(oid)} />
            ))}
          </div>
        </Disclosure>
      )}
    </div>
  )
}
