"use client"

import { useCallback } from "react"
import type { Route } from "next"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Tile, TilePill } from "@/components/brand-kit/tiles/tile"
import { Globe } from "@/components/ui/icon-set/globe"
import { LayoutGrid } from "@/components/ui/icon-set/layout-grid"
import { Send } from "@/components/ui/icon-set/send"
import { InfoTip } from "@/components/ui/info-tip"
import {
  featureFromSlug, PROMOTION_FEATURE_SLUGS, PROMOTION_FEATURES, promotionSummary, type PromotionFeature,
} from "@/modules/toolkit/domain/promotion-hub"
import { FEATURE_COPY, NUDGE, PANEL_COPY } from "./promotion-copy"
import { PrivateCollectionPanel } from "./private-collection-panel"
import { LandingPanel } from "./landing-panel"
import { PublicCollectionPanel } from "./public-collection-panel"
import { usePromotionHub } from "./use-promotion-hub"

const ICONS: Readonly<Record<PromotionFeature, typeof Globe>> = {
  LANDING: Globe,
  PUBLIC_COLLECTION: LayoutGrid,
  PRIVATE_COLLECTION: Send,
}

/** Khoá URL ô đang mở (cùng `?muc=promotion`) — tải lại trang vẫn mở đúng ô. */
export const FEATURE_PARAM = "o"

function Nudge({ text, action, href }: { text: string; action: string; href: string }) {
  return (
    <p className="rounded-xl border border-border bg-surface-alt px-4 py-3 text-body-sm text-text-muted">
      {text}{" "}
      <a href={href} className="font-semibold text-primary hover:underline">{action}</a>
    </p>
  )
}

/**
 * Nhóm "Quảng bá sản phẩm" trên /cong-cu (PO 09/11/2026): 3 ô chức năng độc lập — không khoá thứ tự, không đánh số
 * bước. Mỗi ô dùng lại 100% luồng tạo có sẵn; ô chỉ là khung điều hướng cộng phần tóm tắt. Hồ sơ thiếu hoặc Kho trống
 * chỉ nhắc nhẹ, không chặn.
 */
export function PromotionHubTiles() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const open = featureFromSlug(params.get(FEATURE_PARAM))
  const hub = usePromotionHub()

  const pick = useCallback((f: PromotionFeature | null) => {
    const q = new URLSearchParams(params.toString())
    q.set("muc", "promotion")
    if (f) q.set(FEATURE_PARAM, PROMOTION_FEATURE_SLUGS[f])
    else q.delete(FEATURE_PARAM)
    router.replace(`${pathname}?${q.toString()}` as Route, { scroll: false })
  }, [params, pathname, router])

  return (
    <div className="space-y-6">
      {(hub.profileMissing || hub.noApprovedProducts) && (
        <div className="space-y-2">
          {hub.profileMissing && <Nudge {...NUDGE.profile} />}
          {hub.noApprovedProducts && <Nudge {...NUDGE.products} />}
        </div>
      )}

      <nav aria-label="Các chức năng quảng bá" className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {PROMOTION_FEATURES.map((f) => {
          const summary = promotionSummary(f, hub.sources[f])
          const copy = FEATURE_COPY[f]
          return (
            <Tile
              key={f}
              title={copy.title}
              icon={ICONS[f]}
              tone={open === f ? "selected" : "default"}
              pill={<TilePill tone={summary.tone}>{summary.text}</TilePill>}
              onOpen={() => pick(open === f ? null : f)}
              footer={open === f ? "Đang mở" : "Bấm để mở"}
              footerAction={<InfoTip label={copy.title}>{copy.hint}</InfoTip>}
            />
          )
        })}
      </nav>

      {!open && <p className="text-body-sm text-text-muted">{PANEL_COPY.pickHint}</p>}
      {open === "LANDING" && <LandingPanel hub={hub} />}
      {open === "PUBLIC_COLLECTION" && <PublicCollectionPanel hub={hub} />}
      {open === "PRIVATE_COLLECTION" && <PrivateCollectionPanel hub={hub} />}
    </div>
  )
}
