"use client"

import React, { useEffect, useState } from "react"
import { Eye, ExternalLink, QrCode, Smartphone, Monitor } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { CatalogProduct } from "./catalog-management-tab"
import type { GeneratedLandingPackage } from "@/modules/content-engine/domain/landing-content-generator"
import { useTenantProfile } from "@/lib/hooks/use-tenant-profile"
import { StorefrontPreviewIframe } from "./public/storefront-preview-iframe"
import { buildLandingPreview } from "./landing-publish-payload"
import type { EntryActions } from "@/modules/orders/domain/entry-actions"
import { toPublicReview, type PublicShopReview, type ShopReview } from "@/modules/shop-reviews/domain/review-rules"

export interface EnabledSectionsConfig {
  story: boolean
  products: boolean
  perks: boolean
  process: boolean
  gallery?: boolean
  reviews: boolean
  faq: boolean
  lead: boolean
}

interface LandingCampaignPreviewProps {
  headline: string
  subHeadline?: string | undefined
  selectedProducts: CatalogProduct[]
  occasionId?: string | undefined
  archetypeId?: string | undefined
  customHeroImageUrl?: string | undefined
  videoUrl?: string | undefined
  isPublished: boolean
  isPublishing: boolean
  publishedUrl: string | null
  downloadingQR: boolean
  generatedPackage?: GeneratedLandingPackage | null | undefined
  enabledSections?: EnabledSectionsConfig | undefined
  onPublish: () => void
  onDownloadQR: () => void
}

const DEFAULT_ENABLED_SECTIONS: EnabledSectionsConfig = {
  story: true,
  products: true,
  perks: true,
  process: true,
  gallery: true,
  reviews: true,
  faq: true,
  lead: true,
}

export function LandingCampaignPreview({
  headline,
  subHeadline,
  selectedProducts,
  occasionId = "20-10",
  archetypeId = "minimal-luxury",
  customHeroImageUrl,
  videoUrl,
  isPublished,
  isPublishing,
  publishedUrl,
  downloadingQR,
  generatedPackage,
  enabledSections = DEFAULT_ENABLED_SECTIONS,
  onPublish,
  onDownloadQR,
}: LandingCampaignPreviewProps) {
  const [deviceView, setDeviceView] = useState<"mobile" | "desktop">("mobile")
  const { business } = useTenantProfile()
  // Đánh giá đang bật — giống đúng trang khách sẽ hiện; không có quyền đọc thì bỏ qua
  const [reviews, setReviews] = useState<PublicShopReview[]>([])
  useEffect(() => {
    fetch("/api/v1/shop-reviews")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((j: { data?: ShopReview[] }) => setReviews((j.data ?? []).filter((r) => r.isVisible).slice(0, 6).map(toPublicReview)))
      .catch(() => setReviews([]))
  }, [])
  // Nút Đặt hàng / Liên hệ của nguồn Landing (Điều hành cài ở Đơn hàng); không đọc được → mặc định hệ thống
  const [entryActions, setEntryActions] = useState<EntryActions | null>(null)
  useEffect(() => {
    fetch("/api/v1/orders/entry-actions")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { sources?: { code: string; effective: EntryActions }[] } | null) =>
        setEntryActions(j?.sources?.find((x) => x.code === "LANDING")?.effective ?? null))
      .catch(() => setEntryActions(null))
  }, [])

  return (
    <div className="p-5 rounded-2xl bg-white border border-border shadow-xs space-y-4 animate-in fade-in duration-200">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Eye size={16} className="text-primary" />
          <h3 className="text-body-sm font-bold text-text">Bản xem trước trang khách</h3>
          {isPublished && <Badge tone="success">Đã xuất bản</Badge>}
        </div>

        <div className="flex items-center gap-2">
          {/* Device Viewport Toggle */}
          <div className="flex items-center bg-surface p-0.5 rounded-lg border border-border text-caption mr-2">
            <Button variant="ghost"
              type="button"
              onClick={() => setDeviceView("mobile")}
              className={`h-auto text-[length:inherit] flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-colors ${
                deviceView === "mobile"
                  ? "bg-white text-primary shadow-xs hover:bg-white"
                  : "text-text-muted hover:text-text"
              }`}
            >
              <Smartphone size={13} />
              <span>Điện thoại</span>
            </Button>
            <Button variant="ghost"
              type="button"
              onClick={() => setDeviceView("desktop")}
              className={`h-auto text-[length:inherit] flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-colors ${
                deviceView === "desktop"
                  ? "bg-white text-primary shadow-xs hover:bg-white"
                  : "text-text-muted hover:text-text"
              }`}
            >
              <Monitor size={13} />
              <span>Máy tính</span>
            </Button>
          </div>

          {/* Action Buttons */}
          {/* Xuất bản: chỉ một nút, ở thanh điều hướng của wizard, có hộp xác nhận (R3). */}
          {!isPublished ? null : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(publishedUrl || "", "_blank")}
                className="h-8 gap-1.5 text-caption text-primary font-bold"
              >
                <ExternalLink size={13} />
                <span>Mở trang thật</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDownloadQR}
                disabled={downloadingQR}
                className="h-8 gap-1.5 text-caption text-primary font-bold"
              >
                <QrCode size={13} />
                <span>{downloadingQR ? "Đang tạo..." : "Tải mã QR chiến dịch"}</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Bản xem trước = chính trang khách sẽ thấy sau khi xuất bản */}
      <div className="bg-surface-alt/80 p-4 sm:p-6 rounded-2xl border border-border">
        <StorefrontPreviewIframe
          device={deviceView}
          data={buildLandingPreview(
            {
              headline, occasionId, archetypeId, products: selectedProducts, customHeroImageUrl, videoUrl,
              generatedPackage, enabledSections,
            },
            {
              name: business?.display_name || "Tiệm của bạn",
              legalName: null,
              phone: business?.phone ?? null,
              email: business?.email ?? null,
              address: business?.address ?? null,
              website: business?.website ?? null,
              primaryColor: "#7A2E42",
              logoUrl: null,
            },
            reviews,
            entryActions ?? undefined
          )}
        />
        {!entryActions && (
          <p className="mt-2 text-caption text-text-muted">
            Nút Đặt hàng / Liên hệ đang xem theo mặc định — Điều hành có thể đã đổi trong mục Đơn hàng.
          </p>
        )}
      </div>
    </div>
  )
}
