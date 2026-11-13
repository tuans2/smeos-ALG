"use client"

import React from "react"
import { Input } from "@/components/ui/input"
import type { CatalogProduct } from "./catalog-management-tab"
import { CampaignMediaSettings } from "./campaign-media-settings"
import { CampaignSectionToggles } from "./campaign-section-toggles"
import type { EnabledSectionsConfig } from "./landing-campaign-preview"

interface LandingStepContentSettingsProps {
  headline: string
  onHeadlineChange: (val: string) => void
  userDirectives: string
  onUserDirectivesChange: (val: string) => void
  customHeroImageUrl: string
  onCustomHeroImageChange: (url: string) => void
  videoUrl: string
  onVideoUrlChange: (url: string) => void
  selectedProducts: CatalogProduct[]
  enabledSections: EnabledSectionsConfig
  onEnabledSectionsChange: React.Dispatch<React.SetStateAction<EnabledSectionsConfig>>
}

export function LandingStepContentSettings({
  headline,
  onHeadlineChange,
  userDirectives,
  onUserDirectivesChange,
  customHeroImageUrl,
  onCustomHeroImageChange,
  videoUrl,
  onVideoUrlChange,
  selectedProducts,
  enabledSections,
  onEnabledSectionsChange,
}: LandingStepContentSettingsProps) {
  return (
    <div className="space-y-5">
      <div className="border-b border-border pb-3">
        <h3 className="text-title font-bold text-text">Bước 3: Tinh Chỉnh Nội Dung & Các Khối Hiển Thị</h3>
        <p className="text-body-sm text-text-muted mt-0.5">
          Chỉnh sửa tiêu đề, lời chỉ dẫn AI và cấu hình bật/tắt các section của Landing Page.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-caption font-bold text-text mb-1">Tiêu đề chính (Headline)</label>
          <Input
            value={headline}
            onChange={(e) => onHeadlineChange(e.target.value)}
            className="h-9 text-body-sm"
            placeholder="Nhập tiêu đề trang chiến dịch..."
          />
        </div>
        <div>
          <label className="block text-caption font-bold text-text mb-1">Ghi chú ngữ cảnh cho AI</label>
          <Input
            value={userDirectives}
            onChange={(e) => onUserDirectivesChange(e.target.value)}
            className="h-9 text-body-sm"
            placeholder="VD: Nhấn mạnh hoa nhập khẩu, giảm 10% khi đặt trước..."
          />
        </div>
      </div>

      <CampaignMediaSettings
        customHeroImageUrl={customHeroImageUrl}
        onCustomHeroImageChange={onCustomHeroImageChange}
        videoUrl={videoUrl}
        onVideoUrlChange={onVideoUrlChange}
        selectedProducts={selectedProducts}
      />

      <CampaignSectionToggles
        enabledSections={enabledSections}
        onChange={onEnabledSectionsChange}
      />
    </div>
  )
}
