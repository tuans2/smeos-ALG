"use client"

import React, { useState, useMemo } from "react"
import { BookOpen, ArrowLeft, ArrowRight, Sparkles } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import type { CatalogProduct } from "./catalog-management-tab"
import { type CatalogStyleVariant } from "@/modules/content-engine/domain/catalog-content-generator"
import { generateQRCodeDataUrl, triggerDownload } from "@/core/media/qr-engine"
import { useTenantProfile } from "@/lib/hooks/use-tenant-profile"
import { useSession } from "@/lib/session"
import { getIndustryTerminology } from "@/modules/organization/domain/industry-profile"
import { CatalogWizardStep1Products } from "./catalog-wizard-step1-products"
import { CatalogWizardStep3Intro } from "./catalog-wizard-step3-intro"
import { CatalogWizardStep4Success } from "./catalog-wizard-step4-success"
import { useConfirmPublish } from "./use-confirm-publish"
import { CatalogTemplateSelector } from "./studio/catalog-template-selector"
import type {
  CatalogTemplateId,
  CatalogStyleId,
  CatalogProductItem,
  BrandProfile,
} from "@/modules/catalog-studio/domain/entities/catalog-studio.types"
import { resolveCatalogBrief } from "@/modules/catalog-studio/use-cases/resolve-catalog-brief"
import { templateDisplayName } from "@/modules/catalog-studio/domain/auto-style-resolver"

interface CatalogWizardFlowProps {
  products: CatalogProduct[]
  onCreated: () => void
  onCancelToManage: () => void
  onBackToModeSelection?: () => void
  initialSelectedIds?: string[] | undefined
  initialStyleVariant?: CatalogStyleVariant | undefined
  initialName?: string | undefined
  initialDesc?: string | undefined
  isAiPreFilled?: boolean | undefined
  initialStep?: number | undefined
}

export function CatalogWizardFlow({
  products,
  onCreated,
  onCancelToManage,
  onBackToModeSelection,
  initialSelectedIds,
  initialStyleVariant,
  initialName,
  initialDesc,
  isAiPreFilled = false,
  initialStep,
}: CatalogWizardFlowProps) {
  const { business } = useTenantProfile()
  const { organization } = useSession()
  const ti = getIndustryTerminology(organization?.industry)
  const sampleTerm = ti.sampleProduct || "sản phẩm"
  const currentShopName = business?.display_name || "Cửa hàng của bạn"

  const [currentStep, setCurrentStep] = useState<number>(initialStep ?? 1)
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds || [])
  const [styleVariant, setStyleVariant] = useState<CatalogStyleVariant>(initialStyleVariant || "MODERN_SHOWROOM")
  const [templateId, setTemplateId] = useState<CatalogTemplateId>("T01_SIGNATURE_COLLECTION")
  const [styleId, setStyleId] = useState<CatalogStyleId>("S01_EDITORIAL_MAGAZINE")

  const [name, setName] = useState(initialName || "")
  const [desc, setDesc] = useState(initialDesc || "")

  const [isAiGenerating, setIsAiGenerating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloadingQR, setDownloadingQR] = useState(false)

  const activeProducts = useMemo(() => products.filter((p) => p.status === "ACTIVE"), [products])

  const availableOccasions = useMemo(() => {
    const set = new Set<string>()
    activeProducts.forEach((p) => { if (p.occasion_code) set.add(p.occasion_code) })
    return Array.from(set)
  }, [activeProducts])

  const toggleSelectProduct = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id])
  }

  const handleQuickPreset = (type: "all" | "occasion" | "budget") => {
    if (type === "all") {
      setSelectedIds(activeProducts.map((p) => p.id))
      setName(`Tất cả ${sampleTerm} đang bán`)
      setStyleVariant("MODERN_SHOWROOM")
    } else if (type === "occasion") {
      const occ = availableOccasions[0] || "Sự kiện"
      const matched = activeProducts.filter((p) => p.occasion_code === occ)
      setSelectedIds(matched.length > 0 ? matched.map((p) => p.id) : activeProducts.slice(0, 6).map((p) => p.id))
      setName(`Bộ sưu tập ${sampleTerm} ${occ}`)
      setStyleVariant("EDITORIAL_LOOKBOOK")
    } else if (type === "budget") {
      const budgetProds = activeProducts.filter((p) => p.price && p.price <= 800000)
      setSelectedIds(budgetProds.length > 0 ? budgetProds.map((p) => p.id) : activeProducts.slice(0, 5).map((p) => p.id))
      setName(`Bộ sưu tập ${sampleTerm} Dưới 800K`)
      setStyleVariant("COMPACT_LIST")
    }
    setCurrentStep(2)
  }

  const handleAiWriteIntro = async () => {
    if (!name.trim()) return
    setIsAiGenerating(true)
    try {
      const res = await fetch("/api/v1/content-engine/catalog-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionName: name.trim(),
          productCount: selectedIds.length,
          productIds: selectedIds,
          styleVariant,
        }),
      })
      if (!res.ok) throw new Error("Không thể sinh nội dung")
      const json = await res.json()
      if (json.data?.description) {
        setDesc(json.data.description)
      }
    } catch {
      setDesc(`${name} — ${selectedIds.length} ${sampleTerm} từ ${currentShopName}. Xem ảnh, chọn mẫu và nhắn tiệm để đặt.`)
    } finally {
      setIsAiGenerating(false)
    }
  }

  const handlePublishCatalog = async () => {
    if (!name.trim() || selectedIds.length === 0) return
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/v1/catalog-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: desc.trim() || null,
          filters: { product_ids: selectedIds, style_variant: styleVariant, template_id: templateId, style_id: styleId },
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || data.error?.message || "Không thể tạo liên kết catalog.")
      }
      const json = await res.json()
      const slug: string | undefined = json.data?.slug || json.slug; if (!slug) throw new Error("Chưa nhận được đường dẫn catalog — hãy thử lại."); setPublishedSlug(slug)
      setCurrentStep(4)
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra.")
    } finally {
      setIsSubmitting(false)
    }
  }
  const [confirmPublish, publishDialog] = useConfirmPublish(handlePublishCatalog, "catalog") // R3: link công khai

  const publishedUrl = publishedSlug ? `${window.location.origin}/c/${publishedSlug}` : ""

  const handleDownloadQR = async () => {
    if (!publishedUrl || !publishedSlug) return
    setDownloadingQR(true)
    try {
      const dataUrl = await generateQRCodeDataUrl(publishedUrl, { width: 500, margin: 3 })
      triggerDownload(dataUrl, `QR-Catalog-${publishedSlug}.png`)
    } finally {
      setDownloadingQR(false)
    }
  }

  // Domain models for studio & PDF rendering
  const studioProducts: CatalogProductItem[] = useMemo(() => {
    const chosen = products.filter((p) => selectedIds.includes(p.id))
    return (chosen.length > 0 ? chosen : activeProducts.slice(0, 6)).map((p, idx) => ({
      productId: p.id,
      name: p.name,
      code: p.code || p.id,
      category: p.category ?? null,
      primaryImage: p.imageUrl || null,
      price: p.price ?? null,
      currency: "VND",
      sortOrder: idx + 1,
      status: p.status,
    }))
  }, [products, selectedIds, activeProducts])

  const brandProfile: BrandProfile = useMemo(() => ({
    brandId: organization?.id || "brand",
    name: currentShopName,
    slogan: "Bộ Sưu Tập Tuyển Chọn • ALG 2026",
    brandColors: { primary: "#9A3412" },
    contacts: {
      phone: business?.phone || null,
      hotline: business?.phone || null,
      zalo: business?.phone || null,
      address: business?.address || null,
    },
  }), [organization?.id, business, currentShopName])

  const resolvedCatalog = useMemo(() => {
    return resolveCatalogBrief(
      {
        catalogId: publishedSlug || "preview",
        title: name || `Bộ Sưu Tập ${sampleTerm}`,
        purpose: "COLLECTION",
        audience: "CONSUMER",
        language: "vi-VN",
        styleId,
        templateId,
        pageSize: "A4_PORTRAIT",
        outputProfile: "DIGITAL_PDF",
        brandId: brandProfile.brandId,
        productIds: studioProducts.map((p) => p.productId),
      },
      brandProfile,
      studioProducts
    )
  }, [publishedSlug, name, sampleTerm, styleId, templateId, brandProfile, studioProducts])

  return (
    <div className="space-y-5">
      {/* Header Wizard & Progress */}
      <div className="rounded-xl border border-border bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary-muted text-primary text-caption font-bold uppercase tracking-wider mb-1">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Tạo catalog</span>
          </div>
          <h2 className="text-title font-bold text-text">
            {currentStep === 1 && `Bước 1: Tuyển chọn ${sampleTerm} vào Catalog`}
            {currentStep === 2 && "Bước 2: Chọn Template & Ngôn ngữ Thị giác 2026"}
            {currentStep === 3 && "Bước 3: Đặt tên, lời chào AI & Xem trước"}
            {currentStep === 4 && "Bước 4: Xuất bản thành công & Tải PDF / QR"}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {onBackToModeSelection && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onBackToModeSelection}
              className="text-caption text-text-muted hover:text-text hover:bg-surface-alt"
            >
              ← Đổi chế độ
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancelToManage}
            className="text-caption font-semibold border-border hover:bg-surface-alt"
          >
            Quản lý link đã tạo →
          </Button>
        </div>
      </div>

      {isAiPreFilled && currentStep < 4 && (
        <div className="p-3.5 rounded-xl bg-primary-muted border border-primary-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-primary text-body-sm font-semibold">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>AI đã phân tích và chuẩn bị sẵn các lựa chọn tối ưu cho Catalog. Bạn có thể kiểm tra từng bước!</span>
          </div>
          {onBackToModeSelection && (
            <Button variant="ghost"
              type="button"
              onClick={onBackToModeSelection}
              className="h-auto px-0 py-0 gap-0 text-caption text-primary hover:underline font-bold shrink-0 cursor-pointer"
            >
              Chọn lại phương thức
            </Button>
          )}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-destructive-bg text-destructive text-body-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Wizard Steps Content */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-5">
        {currentStep === 1 && (
          <CatalogWizardStep1Products
            products={products}
            selectedIds={selectedIds}
            onToggleProduct={toggleSelectProduct}
            onSelectAll={setSelectedIds}
            onClearSelection={() => setSelectedIds([])}
            onQuickPreset={handleQuickPreset}
          />
        )}

        {currentStep === 2 && (
          <CatalogTemplateSelector
            selectedTemplateId={templateId}
            selectedStyleId={styleId}
            onSelectTemplate={(tplId, defStyleId) => {
              setTemplateId(tplId)
              setStyleId(defStyleId)
            }}
            onSelectStyle={(sId) => setStyleId(sId)}
            sampleProducts={studioProducts}
            brand={brandProfile}
            collectionTitle={name || `Bộ sưu tập ${sampleTerm}`}
          />
        )}

        {currentStep === 3 && (
          <CatalogWizardStep3Intro
            name={name}
            setName={setName}
            desc={desc}
            setDesc={setDesc}
            selectedCount={selectedIds.length}
            sampleProductTerm={sampleTerm}
            styleName={templateDisplayName(templateId)}
            isAiGenerating={isAiGenerating}
            onAiWriteIntro={handleAiWriteIntro}
          />
        )}

        {currentStep === 4 && publishedUrl && publishedSlug && (
          <CatalogWizardStep4Success
            publishedUrl={publishedUrl}
            publishedSlug={publishedSlug}
            onDownloadQR={handleDownloadQR}
            downloadingQR={downloadingQR}
            imageExportProps={{
              products: studioProducts,
              style: resolvedCatalog.style,
              brand: brandProfile,
              catalogTitle: name || "Catalog",
            }}
            pdfExportProps={{
              pages: resolvedCatalog.pages,
              style: resolvedCatalog.style,
              brand: resolvedCatalog.brand,
              catalogTitle: name || "Catalog",
            }}
          />
        )}

        {/* Step Navigation Controls */}
        {currentStep < 4 && (
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              disabled={currentStep === 1}
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              className="flex items-center gap-1.5 text-body-sm font-semibold border-border hover:bg-surface-alt"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Quay lại</span>
            </Button>

            <div className="flex items-center gap-2">
              {currentStep < 3 ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={currentStep === 1 && selectedIds.length === 0}
                  onClick={() => {
                    if (currentStep === 1 && !name) {
                      setName(`Bộ sưu tập ${selectedIds.length} ${sampleTerm} Tuyển Chọn`)
                    }
                    setCurrentStep((prev) => Math.min(3, prev + 1))
                  }}
                  className="border-primary text-primary hover:bg-primary-muted/20 flex items-center gap-1.5 text-body-sm font-semibold"
                >
                  <span>Tiếp tục ({selectedIds.length} {sampleTerm} đã chọn)</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (<>
                <Button
                  type="button"
                  onClick={() => void confirmPublish()}
                  disabled={isSubmitting || !name.trim()}
                  className="bg-primary text-surface hover:bg-primary-dark flex items-center gap-1.5 text-body-sm font-semibold px-6"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{isSubmitting ? "Đang xuất bản..." : "Xuất bản Catalog ngay →"}</span>
                </Button>{publishDialog}</>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
