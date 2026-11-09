"use client"

import { useState } from "react"
import { LandingCampaignTab } from "@/components/catalog/landing-campaign-tab"
import { useCatalogProducts } from "@/components/catalog/use-catalog-products"
import { LandingTypeSelector } from "@/components/landing-page/landing-type-selector"
import { Button } from "@/components/ui/button"
import { Plus } from "@/components/ui/icon-set/plus"
import { InlineError } from "@/components/ui/inline-error"
import { useTenantProfile } from "@/lib/hooks/use-tenant-profile"
import { LANDING_TYPE_OPTIONS, type LandingPageType } from "@/modules/landing-page/domain/preset-catalog"
import { CAMPAIGN_LANDING_TYPES } from "@/modules/toolkit/domain/promotion-hub"
import { CatalogLinkList } from "./catalog-link-list"
import { FEATURE_COPY, PANEL_COPY } from "./promotion-copy"
import type { PromotionHub } from "./use-promotion-hub"

const CAMPAIGN_OPTIONS = LANDING_TYPE_OPTIONS.filter((o) => (CAMPAIGN_LANDING_TYPES as readonly string[]).includes(o.type))

/**
 * Ô "Landing page": danh sách landing chiến dịch đã tạo, rồi "Tạo landing mới" mở đúng luồng tạo của /landing-page
 * (`LandingCampaignTab`, không sửa ruột) — chỉ hai loại trang chiến dịch. Trang chính thức thuộc nhóm Thương hiệu.
 */
export function LandingPanel({ hub }: { hub: PromotionHub }) {
  const [creating, setCreating] = useState(false)
  const [pageType, setPageType] = useState<LandingPageType>(CAMPAIGN_LANDING_TYPES[0])

  if (!hub.can.links) {
    return <p className="rounded-xl border border-border bg-surface-alt px-4 py-3 text-body-sm text-text-muted">{PANEL_COPY.forbidden("tạo landing page")}</p>
  }

  return (
    <section aria-label={FEATURE_COPY.LANDING.title} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-title-sm font-bold text-text">{FEATURE_COPY.LANDING.title}</h3>
        <Button type="button" size="sm" variant={creating ? "secondary" : "primary"} onClick={() => setCreating((v) => !v)}>
          {creating ? PANEL_COPY.backToList : <><Plus size={14} aria-hidden /> {PANEL_COPY.landingCreate}</>}
        </Button>
      </div>

      {creating ? (
        <LandingCreator pageType={pageType} onPageType={setPageType} onPublished={hub.reloadLinks} />
      ) : (
        <CatalogLinkList
          title={PANEL_COPY.landingList}
          emptyText={PANEL_COPY.landingNone}
          links={hub.landings}
          loading={hub.sources.LANDING.state === "loading"}
          error={hub.linksError}
          canRevoke={hub.can.revoke}
          onRetry={hub.reloadLinks}
          onChanged={hub.reloadLinks}
        />
      )}
    </section>
  )
}

function LandingCreator({ pageType, onPageType, onPublished }: { pageType: LandingPageType; onPageType: (t: LandingPageType) => void; onPublished: () => void }) {
  const { products, error, reload } = useCatalogProducts("landing")
  const { business } = useTenantProfile()
  return (
    <div className="space-y-5 rounded-2xl border border-border bg-surface p-4 sm:p-6">
      {error && <InlineError message={`${error}. Bạn vẫn tạo được trang; danh sách sản phẩm sẽ trống.`} onRetry={() => void reload()} />}
      <LandingTypeSelector selectedType={pageType} onSelectType={onPageType} options={CAMPAIGN_OPTIONS} />
      <LandingCampaignTab
        products={products}
        onRefresh={() => { void reload(); onPublished() }}
        pageType={pageType}
        shopName={business?.display_name}
      />
    </div>
  )
}
