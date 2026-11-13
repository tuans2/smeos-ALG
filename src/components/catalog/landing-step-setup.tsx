"use client"

import React from "react"
import type { CatalogProduct } from "./catalog-management-tab"
import { CampaignOccasionStylePicker } from "./campaign-occasion-style-picker"
import { CampaignProductPicker } from "./campaign-product-picker"

interface LandingStepSetupProps {
  currentStep: number
  selectedOccasion: string
  onOccasionChange: (occId: string) => void
  selectedArchetype: string
  onArchetypeChange: (archId: string) => void
  activeProducts: CatalogProduct[]
  selectedProductIds: string[]
  onToggleProduct: (id: string) => void
  onSelectAllProducts: () => void
  onDeselectAllProducts: () => void
  onOpenQuickUpload: () => void
}

export function LandingStepSetup({
  currentStep,
  selectedOccasion,
  onOccasionChange,
  selectedArchetype,
  onArchetypeChange,
  activeProducts,
  selectedProductIds,
  onToggleProduct,
  onSelectAllProducts,
  onDeselectAllProducts,
  onOpenQuickUpload,
}: LandingStepSetupProps) {
  if (currentStep === 1) {
    return (
      <div className="space-y-4">
        <div className="border-b border-border pb-3">
          <h3 className="text-title font-bold text-text">Bước 1: Chọn Dịp Sự Kiện & Phong Cách Thiết Kế</h3>
          <p className="text-body-sm text-text-muted mt-0.5">
            Chọn sự kiện mục tiêu và tông màu thiết kế phù hợp với phong cách bó hoa của tiệm.
          </p>
        </div>
        <CampaignOccasionStylePicker
          selectedOccasion={selectedOccasion}
          onOccasionChange={onOccasionChange}
          selectedArchetype={selectedArchetype}
          onArchetypeChange={onArchetypeChange}
        />
      </div>
    )
  }

  if (currentStep === 2) {
    return (
      <div className="space-y-4">
        <div className="border-b border-border pb-3">
          <h3 className="text-title font-bold text-text">Bước 2: Tuyển Chọn Sản Phẩm Bán Trong Chiến Dịch</h3>
          <p className="text-body-sm text-text-muted mt-0.5">
            Tích chọn các sản phẩm hoa tiêu biểu từ kho hoặc tải nhanh ảnh mẫu mới.
          </p>
        </div>
        <CampaignProductPicker
          activeProducts={activeProducts}
          selectedProductIds={selectedProductIds}
          onToggleProduct={onToggleProduct}
          onSelectAll={onSelectAllProducts}
          onDeselectAll={onDeselectAllProducts}
          onOpenQuickUpload={onOpenQuickUpload}
        />
      </div>
    )
  }

  return null
}
