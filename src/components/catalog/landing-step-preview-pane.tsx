"use client"

import React from "react"
import type { CatalogProduct } from "./catalog-management-tab"
import { LandingCampaignPreview, type EnabledSectionsConfig } from "./landing-campaign-preview"
import type { GeneratedLandingPackage } from "@/modules/content-engine/domain/landing-content-generator"

interface LandingStepPreviewPaneProps {
  headline: string
  selectedProducts: CatalogProduct[]
  archetypeId: string
  occasionId: string
  customHeroImageUrl: string
  videoUrl: string
  isPublished: boolean
  isPublishing: boolean
  publishedUrl: string | null
  downloadingQR: boolean
  generatedPackage: GeneratedLandingPackage | null
  enabledSections: EnabledSectionsConfig
  onPublish: () => Promise<void>
  onDownloadQR: () => Promise<void>
}

export function LandingStepPreviewPane({
  headline,
  selectedProducts,
  archetypeId,
  occasionId,
  customHeroImageUrl,
  videoUrl,
  isPublished,
  isPublishing,
  publishedUrl,
  downloadingQR,
  generatedPackage,
  enabledSections,
  onPublish,
  onDownloadQR,
}: LandingStepPreviewPaneProps) {
  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-title font-bold text-text">Bước 4: Xem trước và xuất bản</h3>
          <p className="text-body-sm text-text-muted mt-0.5">
            Kiểm tra cách hiển thị trên điện thoại và máy tính trước khi kích hoạt link công khai.
          </p>
        </div>
      </div>

      <LandingCampaignPreview
        headline={headline}
        selectedProducts={selectedProducts}
        archetypeId={archetypeId}
        occasionId={occasionId}
        customHeroImageUrl={customHeroImageUrl}
        videoUrl={videoUrl}
        isPublished={isPublished}
        isPublishing={isPublishing}
        publishedUrl={publishedUrl}
        downloadingQR={downloadingQR}
        generatedPackage={generatedPackage}
        enabledSections={enabledSections}
        onPublish={onPublish}
        onDownloadQR={onDownloadQR}
      />
    </div>
  )
}
