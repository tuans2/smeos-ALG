"use client"

import { Button } from "@/components/ui/button"
import React, { useState } from "react"
import { Sparkles } from "@/components/ui/icons"
import { LandingJourneyEntry, type LandingExecutionMode } from "./landing-journey-entry"
import { DualModeHeader } from "./dual-mode-header"
import type { CatalogProduct } from "./catalog-management-tab"
import { generateQRCodeDataUrl, triggerDownload } from "@/core/media/qr-engine"
import { CAMPAIGN_OCCASIONS, CAMPAIGN_ARCHETYPES } from "./landing-campaign-constants"
import type { EnabledSectionsConfig } from "./landing-campaign-preview"
import { generateLandingPageContent, type GeneratedLandingPackage } from "@/modules/content-engine/domain/landing-content-generator"
import { QuickProductUploadModal } from "./quick-product-upload-modal"
import { SmartInputDropzone, type SmartInputData } from "./smart-input-dropzone"
import { JourneyProcessingState, type ProcessingStep } from "./journey-processing-state"
import { LandingStepIndicator } from "./landing-step-indicator"
import { LandingNextActions } from "./landing-next-actions"
import { LandingStepSetup } from "./landing-step-setup"
import { LandingStepContentSettings } from "./landing-step-content-settings"
import { LandingStepPreviewPane } from "./landing-step-preview-pane"
import { LandingWizardNav } from "./landing-wizard-nav"

import { buildLandingPublishBody } from "./landing-publish-payload"
import { useTenantProfile } from "@/lib/hooks/use-tenant-profile"

interface LandingCampaignTabProps {
  products: CatalogProduct[]
  onRefresh?: () => void
  pageType?: string | undefined // mục đích trang ở /landing-page — gửi cho AI soạn nội dung
  shopName?: string | undefined // tên tiệm đã tải sẵn: nội dung mẫu dựng lúc mount, không được rơi về tên nền tảng
}
export function LandingCampaignTab({ products, onRefresh, pageType, shopName }: LandingCampaignTabProps) {
  const { business } = useTenantProfile()
  const currentShopName = shopName || business?.display_name || "Tiệm hoa ALG"

  // Phase: mode-selection → input → (executing via wizard) → published
  const [journeyPhase, setJourneyPhase] = useState<"mode-selection" | "input" | "wizard">("mode-selection")
  const [executionMode, setExecutionMode] = useState<LandingExecutionMode>("autonomous")
  const [entryMode, setEntryMode] = useState<"auto-input" | "wizard">("auto-input")
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [isAiPreFilled, setIsAiPreFilled] = useState<boolean>(false)

  const [selectedOccasion, setSelectedOccasion] = useState(CAMPAIGN_OCCASIONS[0]?.id || "20-10")
  const [selectedArchetype, setSelectedArchetype] = useState(CAMPAIGN_ARCHETYPES[0]?.id || "minimal-luxury")
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [headline, setHeadline] = useState(CAMPAIGN_OCCASIONS[0]?.defaultHeadline || "")
  const [userDirectives, setUserDirectives] = useState("")
  const [customHeroImageUrl, setCustomHeroImageUrl] = useState("")
  const [videoUrl, setVideoUrl] = useState("")
  const [campaignSlug, setCampaignSlug] = useState("campaign-20-10")

  const [createdProducts, setCreatedProducts] = useState<CatalogProduct[]>([])
  const activeProducts = React.useMemo(() => [...createdProducts, ...products].filter((p) => p.status !== "ARCHIVED"), [createdProducts, products])
  const [isQuickUploadOpen, setIsQuickUploadOpen] = useState(false)

  const [generatedPackage, setGeneratedPackage] = useState<GeneratedLandingPackage | null>(() =>
    generateLandingPageContent({
      shopName: currentShopName,
      occasionId: CAMPAIGN_OCCASIONS[0]?.id || "20-10",
      occasionLabel: CAMPAIGN_OCCASIONS[0]?.label || "Ngày Phụ Nữ Việt Nam 20/10",
      selectedProducts: [],
    })
  )

  const [enabledSections, setEnabledSections] = useState<EnabledSectionsConfig>({
    story: true, products: true, perks: true, process: true, gallery: true, reviews: true, faq: true, lead: true,
  })

  const [isAiGenerating, setIsAiGenerating] = useState(false)
  // Chỉ liệt kê bước có việc thật (03c UX-016) — trước đây có 2 bước "thị giác/chất lượng ảnh" tự chuyển xong theo giờ.
  const [aiSteps, setAiSteps] = useState<ProcessingStep[]>([
    { id: "content", label: "Soạn thảo tiêu đề & nội dung chiến dịch", status: "pending" },
    { id: "layout", label: "Tự động hoàn thiện cấu hình từng bước", status: "pending" },
  ])
  const [isPublishing, setIsPublishing] = useState(false)
  const [isPublished, setIsPublished] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [fallbackReason, setFallbackReason] = useState<null | "ai" | "quyen">(null) // vì sao dùng nội dung mẫu
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null)
  const [downloadingQR, setDownloadingQR] = useState(false)

  const handleSmartAnalyze = async (data: SmartInputData) => {
    setIsAiGenerating(true)
    setPublishError(null)

    setFallbackReason(null)
    setAiSteps([
      { id: "content", label: "Soạn thảo tiêu đề & nội dung chiến dịch", status: "running" },
      { id: "layout", label: "Tự động hoàn thiện cấu hình từng bước", status: "pending" },
    ])

    try {
      let matchedOccasion = selectedOccasion
      const lower = data.userDirectives.toLowerCase()
      if (lower.includes("20/10") || lower.includes("phụ nữ")) matchedOccasion = "20-10"
      else if (lower.includes("valentine") || lower.includes("14/2")) matchedOccasion = "valentine"
      else if (lower.includes("8/3")) matchedOccasion = "8-3"
      else if (lower.includes("khai trương")) matchedOccasion = "grand-opening"
      else if (lower.includes("sinh nhật")) matchedOccasion = "birthday"

      setSelectedOccasion(matchedOccasion)
      if (data.userDirectives) setUserDirectives(data.userDirectives)
      if (data.videoUrl) setVideoUrl(data.videoUrl)
      if (data.imagePreviewUrls[0]) setCustomHeroImageUrl(data.imagePreviewUrls[0])

      const preSelectedIds = activeProducts.slice(0, 4).map((p) => p.id)
      setSelectedProductIds(preSelectedIds)

      // Step 3 — Gọi API sinh nội dung (content step đang running)
      const occObj = CAMPAIGN_OCCASIONS.find((o) => o.id === matchedOccasion)
      const res = await fetch("/api/v1/content-engine/landing-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occasionId: matchedOccasion,
          occasionLabel: occObj?.label || matchedOccasion,
          archetypeId: selectedArchetype,
          selectedProducts: activeProducts.slice(0, 4).map((p) => ({
            id: p.id, name: p.name, code: p.code, price: p.price, category: p.category,
          })),
          userDirectives: data.userDirectives || undefined,
          designDirection: selectedArchetype,
          pageType,
        }),
      }).catch(() => null)

      if (res && res.ok) {
        const json = await res.json()
        setGeneratedPackage(json.data)
        if (json.data?.hero?.headline) setHeadline(json.data.hero.headline)
      } else {
        setFallbackReason(res?.status === 403 ? "quyen" : "ai")
        setGeneratedPackage(generateLandingPageContent({
          shopName: currentShopName,
          occasionId: matchedOccasion,
          occasionLabel: occObj?.label || "Sự kiện đặc biệt",
          selectedProducts: activeProducts.slice(0, 4),
        }))
        if (occObj) setHeadline(occObj.defaultHeadline)
      }

      // Content done
      setAiSteps((prev) =>
        prev.map((s) =>
          s.id === "content" ? { ...s, status: "done" } : s.id === "layout" ? { ...s, status: "running" } : s
        )
      )

      setAiSteps((prev) =>
        prev.map((s) => (s.id === "layout" ? { ...s, status: "done" } : s))
      )

      setCampaignSlug(`campaign-${matchedOccasion}-${Math.random().toString(36).substring(2, 6)}`)
      setIsAiPreFilled(true)
      setExecutionMode("autonomous")
      setEntryMode("wizard")
      // Autonomous: AI hoàn thiện toàn bộ → nhảy thẳng Bước 4 (Review/Edit & Xuất bản)
      setCurrentStep(4)
    } finally {
      setIsAiGenerating(false)
    }
  }

  const handleOccasionChange = (occId: string) => {
    setSelectedOccasion(occId)
    const occ = CAMPAIGN_OCCASIONS.find((o) => o.id === occId)
    if (occ) {
      setHeadline(occ.defaultHeadline)
      const currentProds = activeProducts.filter((p) => selectedProductIds.includes(p.id))
      setGeneratedPackage(generateLandingPageContent({
        shopName: currentShopName,
        occasionId: occ.id,
        occasionLabel: occ.label,
        selectedProducts: currentProds,
      }))
    }
  }

  const toggleProduct = (id: string) => {
    setSelectedProductIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id])
  }

  const handleProductCreated = (newProd: CatalogProduct) => {
    setCreatedProducts((prev) => [newProd, ...prev.filter((p) => p.id !== newProd.id)])
    setSelectedProductIds((prev) => [newProd.id, ...prev])
    if (!customHeroImageUrl && newProd.imageUrl) setCustomHeroImageUrl(newProd.imageUrl)
    onRefresh?.()
  }

  const handlePublish = async () => {
    if (!campaignSlug) return
    setIsPublishing(true)
    setPublishError(null)
    try {
      const res = await fetch("/api/v1/catalog-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildLandingPublishBody({
          headline, occasionId: selectedOccasion, archetypeId: selectedArchetype, products: selectedProducts,
          customHeroImageUrl, videoUrl, generatedPackage, enabledSections,
        })),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error?.message || data.message || "Không thể xuất bản chiến dịch.")
      }
      const slug = ((await res.json().catch(() => ({}))) as { data?: { slug?: string } }).data?.slug ?? campaignSlug; setCampaignSlug(slug)
      setPublishedUrl(`${window.location.origin}/c/${slug}`)
      setIsPublished(true)
      setCurrentStep(5)
      onRefresh?.()
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Lỗi khi xuất bản")
    } finally {
      setIsPublishing(false)
    }
  }

  const handleDownloadCampaignQR = async () => {
    if (!publishedUrl) return
    setDownloadingQR(true)
    try {
      const dataUrl = await generateQRCodeDataUrl(publishedUrl, { width: 500, margin: 3 })
      triggerDownload(dataUrl, `QR-Landing-${selectedOccasion}.png`)
    } finally {
      setDownloadingQR(false)
    }
  }

  const selectedProducts = activeProducts.filter((p) => selectedProductIds.includes(p.id))

  return (
    <div className="space-y-6">
      {/* Phase 1: Chọn mode TRƯỚC khi nhập input — J1 Spec §8 */}
      {journeyPhase === "mode-selection" && !isPublished && (
        <LandingJourneyEntry
          onSelectMode={(mode) => {
            setExecutionMode(mode)
            setEntryMode(mode === "autonomous" ? "auto-input" : "wizard")
            setJourneyPhase("input")
          }}
        />
      )}

      {/* Phase 2+: Sau khi đã chọn mode — DualModeHeader luôn hiện để toggle */}
      {journeyPhase !== "mode-selection" && !isPublished && (
        <DualModeHeader
          mode={entryMode === "auto-input" ? "auto" : "manual"}
          onModeChange={(m) => {
            setEntryMode(m === "auto" ? "auto-input" : "wizard")
            setExecutionMode(m === "auto" ? "autonomous" : "guided")
          }}
          title="Phương thức tạo Landing page chiến dịch"
          description="Lựa chọn linh hoạt giữa Tự động bằng AI hoặc Tự thiết kế từng bước. Bạn có thể đổi bất cứ lúc nào."
        />
      )}

      {journeyPhase !== "mode-selection" && entryMode === "auto-input" && !isPublished ? (
        isAiGenerating ? (
          <JourneyProcessingState
            title="AI đang phân tích nguyên liệu & thiết lập Landing Page"
            steps={aiSteps}
          />
        ) : (
          <SmartInputDropzone
            onAnalyze={handleSmartAnalyze}
            isAnalyzing={isAiGenerating}
            availableProducts={activeProducts}
            onSwitchToManual={() => {
              setEntryMode("wizard")
              setExecutionMode("guided")
            }}
          />
        )
      ) : journeyPhase !== "mode-selection" ? (
        <>
          {isAiPreFilled && !isPublished && (
            <div className="p-3.5 rounded-xl bg-primary-muted border border-primary-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-primary text-body-sm font-semibold">
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>{fallbackReason === "quyen" ? "Tài khoản của bạn chưa được cấp quyền tạo nội dung bằng AI nên đang dùng nội dung mẫu — nhờ Điều hành bật quyền, hoặc chỉnh lại ở từng bước." : fallbackReason ? "AI chưa soạn được nội dung nên đang dùng nội dung mẫu — hãy chỉnh lại ở từng bước trước khi xuất bản." : "AI đã soạn nội dung và điền sẵn các lựa chọn. Bạn có thể kiểm tra từng bước trước khi xuất bản."}</span>
              </div>
              <Button variant="ghost"
                type="button"
                onClick={() => setEntryMode("auto-input")}
                className="h-auto px-0 py-0 gap-0 text-caption font-bold text-primary underline hover:text-primary-dark shrink-0 cursor-pointer"
              >
                Tải lại nguyên liệu khác
              </Button>
            </div>
          )}

          {!isPublished && (
            <LandingStepIndicator
              currentStep={currentStep}
              onStepClick={(step) => setCurrentStep(step)}
              maxAccessibleStep={isPublished ? 5 : 4}
            />
          )}

          {publishError && (
            <div className="p-3 rounded-xl bg-destructive-bg text-destructive text-body-sm">
              ⚠️ {publishError}
            </div>
          )}

          <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-5">
            {(currentStep === 1 || currentStep === 2) && (
              <LandingStepSetup
                currentStep={currentStep}
                selectedOccasion={selectedOccasion}
                onOccasionChange={handleOccasionChange}
                selectedArchetype={selectedArchetype}
                onArchetypeChange={setSelectedArchetype}
                activeProducts={activeProducts}
                selectedProductIds={selectedProductIds}
                onToggleProduct={toggleProduct}
                onSelectAllProducts={() => setSelectedProductIds(activeProducts.map((p) => p.id))}
                onDeselectAllProducts={() => setSelectedProductIds([])}
                onOpenQuickUpload={() => setIsQuickUploadOpen(true)}
              />
            )}

            {currentStep === 3 && (
              <LandingStepContentSettings
                headline={headline}
                onHeadlineChange={setHeadline}
                userDirectives={userDirectives}
                onUserDirectivesChange={setUserDirectives}
                customHeroImageUrl={customHeroImageUrl}
                onCustomHeroImageChange={setCustomHeroImageUrl}
                videoUrl={videoUrl}
                onVideoUrlChange={setVideoUrl}
                selectedProducts={selectedProducts}
                enabledSections={enabledSections}
                onEnabledSectionsChange={setEnabledSections}
              />
            )}

            {currentStep === 4 && (
              <LandingStepPreviewPane
                headline={headline}
                selectedProducts={selectedProducts}
                archetypeId={selectedArchetype}
                occasionId={selectedOccasion}
                customHeroImageUrl={customHeroImageUrl}
                videoUrl={videoUrl}
                isPublished={isPublished}
                isPublishing={isPublishing}
                publishedUrl={publishedUrl}
                downloadingQR={downloadingQR}
                generatedPackage={generatedPackage}
                enabledSections={enabledSections}
                onPublish={handlePublish}
                onDownloadQR={handleDownloadCampaignQR}
              />
            )}

            {currentStep === 5 && publishedUrl && (
              <LandingNextActions
                publishedUrl={publishedUrl}
                campaignSlug={campaignSlug}
                occasionName={selectedOccasion}
                onDownloadQR={handleDownloadCampaignQR}
                downloadingQR={downloadingQR}
                onCreateNewCampaign={() => {
                  setIsPublished(false)
                  setPublishedUrl(null)
                  setCurrentStep(1)
                  setEntryMode("auto-input")
                }}
              />
            )}

            {!isPublished && (
              <LandingWizardNav
                currentStep={currentStep}
                isPublishing={isPublishing}
                onPrev={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                onNext={() => setCurrentStep((prev) => Math.min(4, prev + 1))}
                onPublish={handlePublish}
              />
            )}
          </div>
        </>
      ) : null}

      <QuickProductUploadModal
        isOpen={isQuickUploadOpen}
        onClose={() => setIsQuickUploadOpen(false)}
        onProductCreated={handleProductCreated}
        defaultOccasion={selectedOccasion}
      />
    </div>
  )
}
