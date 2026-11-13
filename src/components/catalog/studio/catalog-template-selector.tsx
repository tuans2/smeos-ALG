"use client"

import { Button } from "@/components/ui/button"
import React, { useState, useMemo } from "react"
import { Check, Sparkles, BookOpen, Layers, Eye, Smartphone, FileText } from "@/components/ui/icons"
import type {
  CatalogTemplateId,
  CatalogStyleId,
  BrandProfile,
  CatalogProductItem,
} from "@/modules/catalog-studio/domain/entities/catalog-studio.types"
import { CATALOG_TEMPLATES, CATALOG_TEMPLATE_LIST } from "@/modules/catalog-studio/domain/templates/template-registry"
import { CATALOG_STYLES } from "@/modules/catalog-studio/domain/styles/style-registry"
import { resolveCatalogBrief } from "@/modules/catalog-studio/use-cases/resolve-catalog-brief"
import { CatalogPageRenderer } from "./catalog-page-renderer"

type StyleCategory = "ALL" | "LUXURY" | "DYNAMIC" | "NATURAL" | "MODERN"

const STYLE_CATEGORY_MAP: Record<CatalogStyleId, StyleCategory> = {
  S01_EDITORIAL_MAGAZINE: "LUXURY",
  S02_PURE_MINIMAL: "LUXURY",
  S03_QUIET_LUXURY: "LUXURY",
  S04_BOLD_POP: "DYNAMIC",
  S08_BENTO_GALLERY: "DYNAMIC",
  S10_PLAYFUL_ILLUSTRATION: "DYNAMIC",
  S05_ORGANIC_NATURAL: "NATURAL",
  S06_BOTANICAL_ATELIER: "NATURAL",
  S07_SWISS_GRID: "MODERN",
  S09_MODERN_RETRO: "MODERN",
  S11_DARK_SHOWCASE: "MODERN",
  S12_MODERN_COMMERCE: "MODERN",
}

const CATEGORY_TABS: { id: StyleCategory; label: string }[] = [
  { id: "ALL", label: "Tất cả (12)" },
  { id: "LUXURY", label: "Sang trọng" },
  { id: "DYNAMIC", label: "Năng động" },
  { id: "NATURAL", label: "Tự nhiên" },
  { id: "MODERN", label: "Hiện đại" },
]

interface CatalogTemplateSelectorProps {
  selectedTemplateId: CatalogTemplateId
  selectedStyleId: CatalogStyleId
  onSelectTemplate: (templateId: CatalogTemplateId, defaultStyleId: CatalogStyleId) => void
  onSelectStyle: (styleId: CatalogStyleId) => void
  sampleProducts: CatalogProductItem[]
  brand: BrandProfile
  collectionTitle: string
}

export function CatalogTemplateSelector({
  selectedTemplateId,
  selectedStyleId,
  onSelectTemplate,
  onSelectStyle,
  sampleProducts,
  brand,
  collectionTitle,
}: CatalogTemplateSelectorProps) {
  const [activeTab, setActiveTab] = useState<"templates" | "styles">("templates")
  const [styleCategory, setStyleCategory] = useState<StyleCategory>("ALL")
  const [previewPageIdx, setPreviewPageIdx] = useState(0)

  // Resolve active catalog structure in memory for real-time preview
  const resolved = useMemo(() => {
    return resolveCatalogBrief(
      {
        catalogId: "preview-id",
        title: collectionTitle || "Bộ Sưu Tập Mẫu",
        purpose: "COLLECTION",
        audience: "CONSUMER",
        language: "vi-VN",
        styleId: selectedStyleId,
        templateId: selectedTemplateId,
        pageSize: "A4_PORTRAIT",
        outputProfile: "DIGITAL_PDF",
        brandId: brand.brandId,
        productIds: sampleProducts.map((p) => p.productId),
      },
      brand,
      sampleProducts
    )
  }, [collectionTitle, selectedStyleId, selectedTemplateId, brand, sampleProducts])

  const activePage = resolved.pages[previewPageIdx] || resolved.pages[0]

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-muted text-primary text-caption font-bold uppercase tracking-wider mb-1">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Mẫu và phong cách catalog</span>
          </div>
          <h3 className="text-title font-bold text-text">Chọn Template & Ngôn Ngữ Thị Giác</h3>
          <p className="text-body-sm text-text-muted mt-0.5">
            Lựa chọn bố cục biên tập và phong cách thẩm mỹ riêng biệt, tôn vinh cá tính thương hiệu của bạn.
          </p>
        </div>

        {/* Tab switcher: Mẫu Prototype vs Phong cách Styles */}
        <div className="inline-flex p-1 rounded-xl bg-surface-alt border border-border">
          <Button variant="ghost"
            type="button"
            onClick={() => setActiveTab("templates")}
            className={`h-auto gap-0 px-3 py-1.5 rounded-lg text-caption font-bold transition-all ${
              activeTab === "templates" ? "bg-surface text-primary shadow-xs hover:bg-surface" : "text-text-muted hover:text-text"
            }`}
          >
            5 Template Bố Cục
          </Button>
          <Button variant="ghost"
            type="button"
            onClick={() => setActiveTab("styles")}
            className={`h-auto gap-0 px-3 py-1.5 rounded-lg text-caption font-bold transition-all ${
              activeTab === "styles" ? "bg-surface text-primary shadow-xs hover:bg-surface" : "text-text-muted hover:text-text"
            }`}
          >
            12 Thư Viện Style 2026
          </Button>
        </div>
      </div>

      {/* Main Layout: Left Picker + Right Live Device Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Selector Options */}
        <div className="lg:col-span-7 space-y-4">
          {activeTab === "templates" ? (
            <div className="space-y-3">
              {CATALOG_TEMPLATE_LIST.map((tpl) => {
                const isSelected = selectedTemplateId === tpl.id
                return (
                  <Button variant="outline"
                    key={tpl.id}
                    type="button"
                    onClick={() => onSelectTemplate(tpl.id, tpl.defaultStyleId)}
                    className={`h-auto text-[length:inherit] font-[inherit] w-full p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary-muted/20 ring-2 ring-primary shadow-xs hover:bg-primary-muted/20"
                        : "border-border bg-surface hover:bg-surface-alt/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 w-full">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-body-sm font-bold text-text">{tpl.name}</span>
                          <span className="text-caption font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {tpl.badge}
                          </span>
                        </div>
                        <div className="text-caption font-semibold text-text-muted mt-0.5">{tpl.subtitle}</div>
                      </div>
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center border shrink-0 ${isSelected ? "bg-primary text-surface border-primary" : "border-border"}`}>
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    </div>

                    <p className="text-caption text-text-muted leading-relaxed">{tpl.description}</p>

                    <div className="pt-2 border-t border-border/60 flex items-center justify-between text-caption text-text-muted">
                      <span>Gồm <strong>{tpl.structure.length} loại trang</strong></span>
                      <span className="italic text-primary font-medium">{tpl.recommendedFor.slice(0, 45)}...</span>
                    </div>
                  </Button>
                )
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {CATEGORY_TABS.map((cat) => (
                  <Button variant="ghost"
                    key={cat.id}
                    type="button"
                    onClick={() => setStyleCategory(cat.id)}
                    className={`h-auto gap-0 px-2.5 py-1 rounded-lg text-caption font-bold transition-all cursor-pointer ${
                      styleCategory === cat.id
                        ? "bg-primary text-surface shadow-xs hover:bg-primary"
                        : "bg-surface border border-border text-text-muted hover:text-text hover:bg-surface-alt"
                    }`}
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
                {Object.values(CATALOG_STYLES)
                  .filter((s) => styleCategory === "ALL" || STYLE_CATEGORY_MAP[s.id] === styleCategory)
                  .map((s) => {
                    const isSelected = selectedStyleId === s.id
                    return (
                      <Button variant="outline"
                        key={s.id}
                        type="button"
                        onClick={() => onSelectStyle(s.id)}
                        className={`h-auto text-[length:inherit] font-[inherit] gap-0 p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary-muted/20 ring-1 ring-primary shadow-xs hover:bg-primary-muted/20"
                            : "border-border bg-surface hover:bg-surface-alt/60"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-caption font-bold text-text truncate max-w-[130px]">{s.name}</span>
                          </div>
                          {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                        </div>

                        <p className="text-caption text-text-muted line-clamp-2 leading-relaxed mb-2">{s.description}</p>

                        <div className="flex items-center gap-1.5 mt-auto">
                          <span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ backgroundColor: s.tokens.background }} />
                          <span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ backgroundColor: s.tokens.accent }} />
                          <span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ backgroundColor: s.tokens.textPrimary }} />
                          <span className="text-caption text-text-muted font-mono ml-auto">{s.typography.fontDisplay.replace("font-", "")}</span>
                        </div>
                      </Button>
                    )
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Interactive Device Preview */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full rounded-2xl border border-border bg-surface-alt/80 p-4 shadow-sm flex flex-col items-center">
            <div className="flex items-center justify-between w-full mb-3 pb-2 border-b border-border text-caption">
              <div className="flex items-center gap-1.5 font-bold text-text">
                <Eye className="h-4 w-4 text-primary" />
                <span>Xem trước</span>
              </div>
              <span className="text-caption font-mono text-text-muted">
                Trang {previewPageIdx + 1} / {resolved.pages.length}
              </span>
            </div>

            {/* Scale wrapper to simulate A4 mobile aspect ratio */}
            <div className="w-full flex justify-center overflow-hidden max-h-[520px] rounded-xl border border-border bg-surface shadow-md">
              <div className="transform scale-[0.68] sm:scale-[0.72] origin-top my-[-50px]">
                {activePage && (
                  <CatalogPageRenderer
                    page={activePage}
                    style={resolved.style}
                    brand={brand}
                    totalPages={resolved.pages.length}
                  />
                )}
              </div>
            </div>

            {/* Page navigation dots */}
            <div className="flex items-center gap-1.5 mt-4">
              {resolved.pages.map((p, idx) => (
                <Button variant="ghost"
                  key={p.pageNumber}
                  type="button"
                  onClick={() => setPreviewPageIdx(idx)}
                  className="px-0 py-0 text-[length:inherit] font-[inherit] gap-0 flex h-6 min-w-6 cursor-pointer items-center justify-center"
                  aria-label={`Trang ${idx + 1}`}
                  aria-current={previewPageIdx === idx ? "page" : undefined}
                >
                  {/* Vùng nhấn 24px (WCAG 2.5.8), chấm hiển thị giữ kích thước cũ */}
                  <span className={`h-2 rounded-full transition-all ${previewPageIdx === idx ? "w-6 bg-primary" : "w-2 bg-border"}`} />
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
