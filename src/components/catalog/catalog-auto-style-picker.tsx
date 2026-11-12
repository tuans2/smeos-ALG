"use client"

import React from "react"
import { Sparkles, CheckCircle2, ChevronRight, Zap } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import type { CatalogTemplateId, CatalogStyleId } from "@/modules/catalog-studio/domain/entities/catalog-studio.types"
import type { StyleSuggestion } from "@/modules/catalog-studio/domain/auto-style-resolver"

interface CatalogAutoStylePickerProps {
  suggestions: StyleSuggestion[]
  selectedTemplateId: CatalogTemplateId
  selectedStyleId: CatalogStyleId
  onSelect: (templateId: CatalogTemplateId, styleId: CatalogStyleId) => void
  onConfirm: () => void
  onBack?: () => void
  isConfirming?: boolean
}

const CONFIDENCE_LABEL: Record<StyleSuggestion["confidence"], string> = {
  HIGH: "Phù hợp cao",
  MEDIUM: "Phù hợp",
  LOW: "Gợi ý thêm",
}

const CONFIDENCE_COLOR: Record<StyleSuggestion["confidence"], string> = {
  HIGH: "bg-success-bg text-success border-success/30",
  MEDIUM: "bg-primary-muted text-primary border-primary/20",
  LOW: "bg-surface-alt text-text-muted border-border",
}

const TEMPLATE_BADGE_COLOR: Record<string, string> = {
  T01_SIGNATURE_COLLECTION: "bg-surface-alt text-primary border-primary/20",
  T02_MINIMAL_PRODUCT_LIST: "bg-surface-alt text-text border-border",
  T03_PREMIUM_LOOKBOOK: "bg-surface-alt text-text-muted border-border",
  T04_BENTO_SHOWCASE: "bg-primary-muted text-primary border-primary/20",
  T05_DARK_CINEMATIC: "bg-text text-warning border-border",
}

const STYLE_PREVIEW_BG: Record<string, string> = {
  S01_EDITORIAL_MAGAZINE: "bg-[#FAF8F5]",
  S02_PURE_MINIMAL: "bg-surface",
  S03_QUIET_LUXURY: "bg-[#F7F5F0]",
  S04_BOLD_POP: "bg-[#FFFBEB]",
  S05_ORGANIC_NATURAL: "bg-[#F4F1EA]",
  S06_BOTANICAL_ATELIER: "bg-[#FAFDF7]",
  S07_SWISS_GRID: "bg-surface",
  S08_BENTO_GALLERY: "bg-[#F8FAFC]",
  S09_MODERN_RETRO: "bg-[#FEFCE8]",
  S10_PLAYFUL_ILLUSTRATION: "bg-[#FFF1F2]",
  S11_DARK_SHOWCASE: "bg-[#09090B]",
  S12_MODERN_COMMERCE: "bg-surface",
}

const STYLE_ACCENT_COLOR: Record<string, string> = {
  S01_EDITORIAL_MAGAZINE: "#9A3412",
  S02_PURE_MINIMAL: "#18181B",
  S03_QUIET_LUXURY: "#B45309",
  S04_BOLD_POP: "#EA580C",
  S05_ORGANIC_NATURAL: "#4D7C0F",
  S06_BOTANICAL_ATELIER: "#2D6A4F",
  S07_SWISS_GRID: "#2563EB",
  S08_BENTO_GALLERY: "#6366F1",
  S09_MODERN_RETRO: "#CA8A04",
  S10_PLAYFUL_ILLUSTRATION: "#F43F5E",
  S11_DARK_SHOWCASE: "#F59E0B",
  S12_MODERN_COMMERCE: "#0D9488",
}

/**
 * CatalogAutoStylePicker — Bước chọn style trong luồng Tự động.
 * AI phân tích userDirectives → gợi ý top 2–3 template/style.
 * Người dùng xem preview màu sắc & confirm trước khi AI chạy thật.
 */
export function CatalogAutoStylePicker({
  suggestions,
  selectedTemplateId,
  selectedStyleId,
  onSelect,
  onConfirm,
  onBack,
  isConfirming = false,
}: CatalogAutoStylePickerProps) {
  const topSuggestion = suggestions[0]

  return (
    <div className="rounded-2xl border border-primary-border bg-surface shadow-xs overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-muted/60 to-primary-muted/20 px-5 py-4 border-b border-primary-border">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-body-sm font-black text-primary uppercase tracking-wider">
            AI đã phân tích — Chọn phong cách Catalog
          </span>
        </div>
        <p className="text-caption text-text-muted ml-9">
          Dựa trên yêu cầu của bạn, AI gợi ý những phong cách phù hợp nhất. Chọn 1 rồi bấm Xác nhận để AI bắt đầu tạo catalog.
        </p>
      </div>

      <div className="p-5 space-y-3">
        {suggestions.map((suggestion) => {
          const isSelected =
            selectedTemplateId === suggestion.templateId &&
            selectedStyleId === suggestion.styleId
          const accentColor = STYLE_ACCENT_COLOR[suggestion.styleId] ?? "#9A3412"
          const bgClass = STYLE_PREVIEW_BG[suggestion.styleId] ?? "bg-surface"
          const badgeClass =
            TEMPLATE_BADGE_COLOR[suggestion.templateId] ??
            "bg-surface-alt text-text-muted border-border"

          return (
            <Button variant="ghost"
              key={`${suggestion.templateId}-${suggestion.styleId}`}
              type="button"
              onClick={() => onSelect(suggestion.templateId, suggestion.styleId)}
              className={`h-auto px-0 py-0 text-[length:inherit] justify-start font-[inherit] gap-0 w-full text-left rounded-xl border-2 transition-all duration-200 overflow-hidden cursor-pointer ${
                isSelected
                  ? "border-primary shadow-md ring-2 ring-primary/20"
                  : "border-border hover:border-primary/40 hover:shadow-xs"
              }`}
            >
              <div className="flex items-stretch">
                {/* Color Swatch Preview */}
                <div
                  className={`w-16 shrink-0 flex flex-col items-center justify-center gap-1 p-2 ${bgClass}`}
                  style={{ borderRight: `3px solid ${accentColor}` }}
                >
                  <div
                    className="w-8 h-8 rounded-lg shadow-xs"
                    style={{ backgroundColor: accentColor }}
                  />
                  <span
                    className="text-caption font-bold tracking-widest uppercase text-center leading-tight"
                    style={{ color: accentColor }}
                  >
                    {suggestion.emoji}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 p-3.5 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* AI top pick badge */}
                      {suggestion === topSuggestion && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary text-white text-caption font-black uppercase tracking-wider">
                          <Zap className="h-2.5 w-2.5" />
                          AI Chọn
                        </span>
                      )}
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md border text-caption font-bold uppercase ${badgeClass}`}
                      >
                        {suggestion.templateName}
                      </span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md border text-caption font-semibold ${
                          CONFIDENCE_COLOR[suggestion.confidence]
                        }`}
                      >
                        {CONFIDENCE_LABEL[suggestion.confidence]}
                      </span>
                    </div>

                    <div>
                      <span className="text-body-sm font-bold text-text">
                        {suggestion.styleName}
                      </span>
                    </div>

                    <p className="text-caption text-text-muted leading-relaxed line-clamp-2">
                      {suggestion.reason}
                    </p>
                  </div>

                  {/* Selection indicator */}
                  <div className="shrink-0">
                    {isSelected ? (
                      <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      </div>
                    ) : (
                      <div className="h-6 w-6 rounded-full border-2 border-border" />
                    )}
                  </div>
                </div>
              </div>
            </Button>
          )
        })}
      </div>

      {/* Footer Action */}
      <div className="px-5 pb-5 pt-2 flex items-center justify-between gap-3 border-t border-border/50">
        {onBack ? (
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isConfirming}
            className="text-body-sm font-medium"
          >
            ← Quay lại nhập yêu cầu
          </Button>
        ) : (
          <p className="text-caption text-text-muted">
            Đã chọn:{" "}
            <strong className="text-text">
              {suggestions.find(
                (s) =>
                  s.templateId === selectedTemplateId &&
                  s.styleId === selectedStyleId
              )?.styleName ?? "—"}
            </strong>
          </p>
        )}
        <Button
          type="button"
          onClick={onConfirm}
          disabled={isConfirming}
          className="bg-primary text-surface hover:bg-primary-dark flex items-center gap-2 px-6 font-bold"
        >
          {isConfirming ? (
            <span>Đang tạo Catalog...</span>
          ) : (
            <>
              <span>Xác nhận & Tạo Catalog ngay</span>
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
