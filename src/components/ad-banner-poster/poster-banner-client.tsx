"use client"

import React, { useState, useRef, useCallback, useMemo } from "react"
import { Download } from "@/components/ui/icon-set/download"
import { FolderUp } from "@/components/ui/icon-set/folder-up"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { Share2 } from "@/components/ui/icon-set/share2"
import { LayoutGrid } from "@/components/ui/icon-set/layout-grid"
import { Button } from "@/components/ui/button"
import { useSession } from "@/lib/session"
import { useTenantProfile } from "@/lib/hooks/use-tenant-profile"
import { TabActionHeader, type TabItem, type TabAction, type TabOverflowAction } from "@/components/ui/tab-header"
import {
  type BannerAspectRatio,
  type BannerCopyPayload,
  type BannerBrandInfo,
  type BannerStylePresetId,
} from "@/modules/ad-banner-poster/domain/banner-types"
import { getBannerPreset } from "@/modules/ad-banner-poster/domain/banner-presets"
import {
  getInstantBannerTemplate,
  generateInstantBannerCopy,
} from "@/modules/ad-banner-poster/domain/banner-template-generator"
import type { BannerTemplateItem } from "@/modules/ad-banner-poster/domain/template-catalog"
import { BannerGuidanceCallout } from "./banner-guidance-callout"
import { BannerFormPanel } from "./banner-form-panel"
import { useShopPromotions } from "./use-shop-promotions"
import { shopPromotionBadge } from "@/modules/ad-banner-poster/domain/promotion-guard"
import { PresetStyleSelector } from "./preset-style-selector"
import { MultiSizeGrid } from "./multi-size-grid"
import { SinglePreviewModal } from "./single-preview-modal"
import { TemplateGalleryModal } from "./template-gallery-modal"
import { usePosterActions } from "./use-poster-actions"
import type { GenerationEngine } from "./auto-generate-panel"

const FORMAT_TABS: TabItem[] = [
  { id: "ALL", label: "Tất cả kích thước (5)" },
  { id: "1:1", label: "Vuông 1:1" },
  { id: "4:5", label: "Dọc 4:5" },
  { id: "9:16", label: "Story 9:16" },
  { id: "16:9", label: "Banner 16:9" },
  { id: "A4", label: "Poster in A4" },
]

export function PosterBannerClient() {
  const { orgName } = useSession()

  // ── State ──────────────────────────────────────────────────────────
  const [industryKey] = useState("FLORAL")
  const [occasionKey, setOccasionKey] = useState("OPENING")
  const [occasionLabel, setOccasionLabel] = useState("Khai trương hồng phát")
  const [selectedPresetId, setSelectedPresetId] = useState<BannerStylePresetId>("FESTIVE_SEASON")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>("tpl-opening-cheer")
  const [generationEngine, setGenerationEngine] = useState<GenerationEngine>("TEMPLATE_ENGINE")
  const [isGalleryOpen, setIsGalleryOpen] = useState(false)
  const [activeFormatTab, setActiveFormatTab] = useState("ALL")
  const [singleModalFormat, setSingleModalFormat] = useState<BannerAspectRatio | null>(null)

  const [copy, setCopy] = useState<BannerCopyPayload>(() =>
    generateInstantBannerCopy({
      occasionKey: "OPENING",
      shopName: orgName || "Cửa Hàng Của Bạn",
    })
  )

  // Hotline/địa chỉ lấy từ hồ sơ cửa hàng — không điền số mẫu (poster tải về sẽ mang thông tin giả).
  const { business } = useTenantProfile()
  const shopPromotions = useShopPromotions()
  // Nhãn ưu đãi chỉ lấy từ ưu đãi tiệm đang bật — giữ lựa chọn hiện tại nếu còn hợp lệ
  const ownBadge = () => shopPromotionBadge(shopPromotions, copy.promotionBadge)
  const [brandEdits, setBrandEdits] = useState<Partial<BannerBrandInfo>>({})
  const brandInfo = useMemo<BannerBrandInfo>(() => ({
    shopName: brandEdits.shopName ?? (business?.display_name || orgName || "Cửa Hàng Của Bạn"),
    hotline: brandEdits.hotline ?? business?.phone ?? "",
    address: brandEdits.address ?? business?.address ?? "",
  }), [brandEdits, business, orgName])
  // Chưa có ảnh cho tới khi người dùng tải lên — không dùng ảnh mẫu thay ảnh sản phẩm.
  const [productImageUrl, setProductImageUrl] = useState<string | undefined>(undefined)

  const [isGenerating, setIsGenerating] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const cardRefs = useRef<Map<BannerAspectRatio, HTMLDivElement>>(new Map())
  const registerCardRef = useCallback((format: BannerAspectRatio, el: HTMLDivElement | null) => {
    if (el) cardRefs.current.set(format, el)
    else cardRefs.current.delete(format)
  }, [])

  const {
    exportingFormat,
    isExportingAll,
    isSavingToLibrary,
    handleDownloadFormat,
    handleDownloadAll,
    handleSaveToLibrary,
  } = usePosterActions({
    cardRefs,
    copy,
    occasionKey,
    occasionLabel,
    selectedPresetId,
    activeFormatTab,
    setStatusMessage,
  })

  // ── Handlers ───────────────────────────────────────────────────────
  const handleCopyChange = (field: keyof BannerCopyPayload, value: string) => {
    setCopy((prev) => ({ ...prev, [field]: value }))
  }

  const handleBrandInfoChange = (field: keyof BannerBrandInfo, value: string) => {
    setBrandEdits((prev) => ({ ...prev, [field]: value }))
  }

  const handleOccasionChange = (key: string, label: string) => {
    setOccasionKey(key)
    setOccasionLabel(label)

    const tpl = getInstantBannerTemplate(key)
    setSelectedPresetId(tpl.recommendedPreset)
    const newCopy = generateInstantBannerCopy({
      occasionKey: key,
      shopName: brandInfo.shopName,
      suggestedPromotion: ownBadge(),
    })
    setCopy(newCopy)
    setStatusMessage(`Đã chọn dịp "${label}" — tự động chuyển phong cách và thông điệp phù hợp!`)
  }

  const handleSelectTemplate = (tpl: BannerTemplateItem) => {
    setSelectedTemplateId(tpl.id)
    setSelectedPresetId(tpl.stylePresetId)
    setCopy({ ...tpl.defaultCopy, promotionBadge: ownBadge(), validityText: "" })
    setStatusMessage(`Đã áp dụng mẫu: "${tpl.name}"`)
  }

  const handleTriggerAutoGenerate = async () => {
    setIsGenerating(true)
    setStatusMessage(`Đang tạo poster & banner cho dịp "${occasionLabel}"...`)

    const tpl = getInstantBannerTemplate(occasionKey)
    setSelectedPresetId(tpl.recommendedPreset)

    try {
      const res = await fetch("/api/v1/ad-banner-poster/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry_key: industryKey,
          occasion_key: occasionKey,
          occasion_label: occasionLabel,
          shop_name: brandInfo.shopName,
          desired_promotion: copy.promotionBadge,
        }),
      })

      const data = await res.json().catch(() => null)
      if (res.ok && data?.data?.copy) {
        setCopy(data.data.copy)
      } else {
        const fallback = generateInstantBannerCopy({
          occasionKey,
          shopName: brandInfo.shopName,
          suggestedPromotion: ownBadge(),
        })
        setCopy(fallback)
      }

      setStatusMessage(
        generationEngine === "AI_PROVIDER"
          ? `AI đã hoàn thiện trọn bộ 5 kích thước cho dịp "${occasionLabel}"!`
          : `Đã tạo mới thành công trọn bộ 5 kích thước cho dịp "${occasionLabel}"!`
      )
    } catch {
      const fallback = generateInstantBannerCopy({
        occasionKey,
        shopName: brandInfo.shopName,
        suggestedPromotion: ownBadge(),
      })
      setCopy(fallback)
      setStatusMessage(`Đã tự động dàn trang 5 kích thước chuẩn cho dịp "${occasionLabel}"!`)
    } finally {
      setIsGenerating(false)
    }
  }

  const primaryActions: TabAction[] = [
    {
      id: "save-to-library",
      label: isSavingToLibrary ? "Đang lưu..." : "Lưu vào kho",
      icon: FolderUp,
      variant: "secondary",
      onClick: handleSaveToLibrary,
      disabled: isSavingToLibrary,
    },
    {
      id: "download-all",
      label: isExportingAll ? "Đang xuất 5 file..." : "Tải trọn bộ (5 kích thước)",
      icon: Download,
      variant: "primary",
      onClick: handleDownloadAll,
      disabled: isExportingAll,
    },
  ]

  const overflowActions: TabOverflowAction[] = [
    { id: "open-gallery", label: "Kho mẫu thiết kế", icon: LayoutGrid, onClick: () => setIsGalleryOpen(true) },
    {
      id: "reset",
      label: "Đặt lại ban đầu",
      icon: RefreshCw,
      onClick: () => {
        handleOccasionChange("OPENING", "Khai trương hồng phát")
      },
    },
    {
      id: "share",
      label: "Chia sẻ mẫu thiết kế",
      icon: Share2,
      onClick: () => {
        navigator.clipboard?.writeText(window.location.href)
        setStatusMessage("Đã sao chép liên kết vào bộ nhớ tạm!")
      },
    },
  ]

  const currentPreset = getBannerPreset(selectedPresetId)

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <h1 className="sr-only">Tạo poster và banner quảng cáo</h1>
      <TabActionHeader
        tabs={FORMAT_TABS}
        activeTab={activeFormatTab}
        onTabChange={setActiveFormatTab}
        primaryActions={primaryActions}
        overflowActions={overflowActions}
      />
      <BannerGuidanceCallout />

      {statusMessage && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-selected border border-primary/20 text-caption font-semibold text-primary">
          <span>{statusMessage}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setStatusMessage(null)}
            className="text-primary hover:opacity-70 text-caption h-auto p-0 hover:bg-transparent"
          >
            Đóng
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 space-y-5">
          <PresetStyleSelector
            selectedPresetId={selectedPresetId}
            onSelectPreset={setSelectedPresetId}
          />

          <BannerFormPanel
            industryKey={industryKey}
            occasionKey={occasionKey}
            occasionLabel={occasionLabel}
            onOccasionChange={handleOccasionChange}
            copy={copy}
            onCopyChange={handleCopyChange}
            brandInfo={brandInfo}
            onBrandInfoChange={handleBrandInfoChange}
            productImageUrl={productImageUrl}
            onProductImageChange={setProductImageUrl}
            shopPromotions={shopPromotions}
            onTriggerAiCopy={handleTriggerAutoGenerate}
            onTriggerAutoGenerate={handleTriggerAutoGenerate}
            isGenerating={isGenerating}
            generationEngine={generationEngine}
            onEngineChange={setGenerationEngine}
            onOpenTemplateGallery={() => setIsGalleryOpen(true)}
          />
        </div>

        <div className="lg:col-span-7">
          <MultiSizeGrid
            copy={copy}
            brandInfo={brandInfo}
            preset={currentPreset}
            productImageUrl={productImageUrl}
            activeFormatTab={activeFormatTab}
            onFormatTabChange={setActiveFormatTab}
            onOpenSingleModal={setSingleModalFormat}
            onDownloadFormat={handleDownloadFormat}
            isExportingFormat={exportingFormat}
            isGenerating={isGenerating}
            registerCardRef={registerCardRef}
          />
        </div>
      </div>

      <SinglePreviewModal
        isOpen={Boolean(singleModalFormat)}
        format={singleModalFormat}
        copy={copy}
        brandInfo={brandInfo}
        preset={currentPreset}
        productImageUrl={productImageUrl}
        onClose={() => setSingleModalFormat(null)}
        onDownload={handleDownloadFormat}
        isDownloading={Boolean(exportingFormat)}
      />

      <TemplateGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        onSelectTemplate={handleSelectTemplate}
        selectedTemplateId={selectedTemplateId}
        previewImageUrl={productImageUrl}
      />
    </div>
  )
}
