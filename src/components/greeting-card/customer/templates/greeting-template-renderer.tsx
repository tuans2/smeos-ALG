"use client"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import React, { useState } from "react"
import { Sparkles, Layers } from "@/components/ui/icons"
import type { GreetingCatalogProduct } from "@/modules/greeting-card/domain/greeting-card-types"
import {
  GreetingTemplateId,
  GREETING_TEMPLATES,
  GREETING_TEMPLATE_LIST,
  resolveGreetingTemplateId,
} from "@/modules/greeting-card/domain/greeting-template-registry"
import { SwipeBrochureEngine } from "./swipe-brochure-engine"
import { EmbeddedPreviewContext } from "./aux/embedded"
import { DisplayFieldsContext } from "./product-info/display-fields-context"
import { DEFAULT_ENABLED_FIELDS, type OptionalDisplayField } from "@/modules/greeting-card/domain/display-fields"
import { LookbookGridDeck } from "./lookbook-grid-deck"
import { EditorialStoryDeck } from "./editorial-story-deck"
import { VideoReelsDeck } from "./video-reels-deck"
import { OccasionBudgetDeck } from "./occasion-budget-deck"
import { ColorMoodboardDeck } from "./color-moodboard-deck"
import { SplitCompareDeck } from "./split-compare-deck"

interface GreetingTemplateRendererProps {
  templateId?: string | null | undefined
  products: GreetingCatalogProduct[]
  catalogName: string
  selectedProductId: string | null
  initialCustomerName?: string | null | undefined
  appliedPolicies?: import("@/modules/greeting-card/domain/store-policy").PublicAppliedPolicies | undefined
  onSelectProduct: (product: GreetingCatalogProduct) => void
  showTemplateSwitcher?: boolean | undefined
  /** Dựng thu nhỏ trong khung xem trước của trang quản lý */
  embedded?: boolean | undefined
  /** Trường thông tin cửa hàng bật cho mẫu này (mặc định: tất cả) */
  displayFields?: readonly OptionalDisplayField[] | undefined
}

export function GreetingTemplateRenderer({
  templateId,
  products,
  catalogName,
  selectedProductId,
  initialCustomerName,
  appliedPolicies,
  onSelectProduct,
  showTemplateSwitcher = false,
  embedded = false,
  displayFields = DEFAULT_ENABLED_FIELDS,
}: GreetingTemplateRendererProps) {
  const [activeTemplate, setActiveTemplate] = useState<GreetingTemplateId>(() =>
    resolveGreetingTemplateId(templateId)
  )

  // Đồng bộ khi cha đổi templateId (điều chỉnh state trong lúc render, không dùng effect)
  const [syncedTemplateId, setSyncedTemplateId] = useState(templateId)
  if (syncedTemplateId !== templateId) {
    setSyncedTemplateId(templateId)
    setActiveTemplate(resolveGreetingTemplateId(templateId))
  }

  const currentDef = GREETING_TEMPLATES[activeTemplate] || GREETING_TEMPLATES["editorial-luxury"]

  return (
    <EmbeddedPreviewContext.Provider value={embedded}>
    <DisplayFieldsContext.Provider value={displayFields}>
    <div className={`w-full flex flex-col items-center relative ${embedded ? "h-full" : ""}`}>
      {/* Subtle Floating Template Switcher (Cho phép khách/nhân viên đổi mẫu xem nhanh) */}
      {showTemplateSwitcher && (
        <div className="w-full max-w-sm flex items-center justify-between px-4 mb-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-border text-text-muted hover:text-text text-caption font-medium transition-colors shadow-2xs cursor-pointer"
              title="Nhấn để đổi mẫu giao diện trải nghiệm"
            >
              <Layers size={13} className="text-primary" />
              <span>Mẫu: <strong>{currentDef.name}</strong></span>
              <span className="text-caption text-primary underline ml-0.5">Đổi</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72 max-h-96 overflow-y-auto p-2">
              <DropdownMenuLabel className="text-caption font-bold text-text-muted px-2 py-1 uppercase tracking-wider border-b border-border mb-1">
                Chọn Mẫu Giao Diện ({GREETING_TEMPLATE_LIST.length})
              </DropdownMenuLabel>
              {GREETING_TEMPLATE_LIST.map((tpl) => (
                <DropdownMenuItem
                  key={tpl.id}
                  onClick={() => setActiveTemplate(tpl.id)}
                  className={`justify-between rounded-xl p-2 text-caption ${
                    activeTemplate === tpl.id ? "bg-selected text-primary font-bold" : "text-text"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold truncate">
                      {tpl.styleNumber ? `${tpl.styleNumber}. ` : ""}
                      {tpl.name}
                    </div>
                    <div className="text-caption text-text-muted truncate">{tpl.badge}</div>
                  </div>
                  {activeTemplate === tpl.id && <Sparkles size={13} className="text-primary shrink-0" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Render 1 of 12 Visual Swipe Styles via Unified Engine */}
      {(activeTemplate === "editorial-luxury" ||
        activeTemplate === "minimal-clean" ||
        activeTemplate === "cinematic-dark" ||
        activeTemplate === "romantic-pastel" ||
        activeTemplate === "botanical-frame" ||
        activeTemplate === "glassmorphism" ||
        activeTemplate === "real-life-shop" ||
        activeTemplate === "real-life-daylight" ||
        activeTemplate === "real-life-in-store" ||
        activeTemplate === "real-life-handheld" ||
        activeTemplate === "lifestyle-context" ||
        activeTemplate === "mixed-media" ||
        activeTemplate === "enterprise-luxury" ||
        activeTemplate === "swipe-classic") && (
        <SwipeBrochureEngine
          products={products}
          catalogName={catalogName}
          selectedProductId={selectedProductId}
          initialCustomerName={initialCustomerName}
          promotionCta={appliedPolicies?.intakePromotionCta}
          onSelectProduct={onSelectProduct}
          styleKey={activeTemplate}
        />
      )}

      {/* Auxiliary Decks */}
      {activeTemplate === "lookbook-grid" && (
        <LookbookGridDeck
          products={products}
          catalogName={catalogName}
          selectedProductId={selectedProductId}
          onSelectProduct={onSelectProduct}
        />
      )}

      {activeTemplate === "editorial-story" && (
        <EditorialStoryDeck
          products={products}
          catalogName={catalogName}
          selectedProductId={selectedProductId}
          onSelectProduct={onSelectProduct}
        />
      )}

      {activeTemplate === "video-reels" && (
        <VideoReelsDeck
          products={products}
          catalogName={catalogName}
          selectedProductId={selectedProductId}
          onSelectProduct={onSelectProduct}
        />
      )}

      {activeTemplate === "occasion-budget-quiz" && (
        <OccasionBudgetDeck
          products={products}
          catalogName={catalogName}
          selectedProductId={selectedProductId}
          onSelectProduct={onSelectProduct}
        />
      )}

      {activeTemplate === "event-moodboard" && (
        <ColorMoodboardDeck
          products={products}
          catalogName={catalogName}
          selectedProductId={selectedProductId}
          onSelectProduct={onSelectProduct}
        />
      )}

      {activeTemplate === "split-compare" && (
        <SplitCompareDeck
          products={products}
          catalogName={catalogName}
          selectedProductId={selectedProductId}
          onSelectProduct={onSelectProduct}
        />
      )}
    </div>
    </DisplayFieldsContext.Provider>
    </EmbeddedPreviewContext.Provider>
  )
}
