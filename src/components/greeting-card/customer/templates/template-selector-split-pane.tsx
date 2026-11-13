"use client"

import { Button } from "@/components/ui/button"
import React, { useState, useEffect, useCallback, useRef } from "react"
import { Check, ChevronLeft, ChevronRight, Layers, Settings2, Sparkles } from "@/components/ui/icons"
import { enabledFieldsFor, type DisplaySettings, type OptionalDisplayField } from "@/modules/greeting-card/domain/display-fields"
import {
  GreetingTemplateId,
  GREETING_TEMPLATE_LIST,
  getIndustryGreetingTemplateList,
} from "@/modules/greeting-card/domain/greeting-template-registry"
import { getIndustryTerminology } from "@/modules/organization/domain/industry-profile"
import type { GreetingCatalogProduct } from "@/modules/greeting-card/domain/greeting-card-types"
import { GreetingTemplateRenderer } from "./greeting-template-renderer"
import { TemplateThumb } from "./template-thumb"
import { useCatalogProducts } from "./use-catalog-products"
import { driveThumbProxySrc } from "@/components/greeting-card/drive-thumb-image"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Kích thước màn hình điện thoại mà mẫu thật được dựng trước khi thu nhỏ */
const CARD_NATURAL_W = 390
/** Scale factor to fit inside our compact phone shell */
const CARD_SCALE = 0.55
/** Resulting displayed width/height of the scaled card area */
const PHONE_INNER_W = Math.round(CARD_NATURAL_W * CARD_SCALE) // ≈ 209px
const CARD_NATURAL_H = 760
const PHONE_INNER_H = Math.round(CARD_NATURAL_H * CARD_SCALE) // ≈ 308px
/** Total height of the split pane panel */
const PANEL_H = 520

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TemplateSelectorSplitPaneProps {
  selectedTemplateId: GreetingTemplateId
  onSelectTemplate: (id: GreetingTemplateId) => void
  catalogId?: string | undefined
  previewProducts?: GreetingCatalogProduct[] | undefined
  /** Cấu hình trường hiển thị của cửa hàng — khung xem trước áp dụng ngay */
  displaySettings?: DisplaySettings | undefined
  /** Mở cài đặt bật/tắt trường cho một mẫu */
  onOpenDisplaySettings?: ((id: GreetingTemplateId) => void) | undefined
  /** Mã ngành để chuyên biệt hóa văn phong và gợi ý mẫu */
  industryKey?: string | null | undefined
}

// ---------------------------------------------------------------------------
// Khung điện thoại thu nhỏ — dựng đúng giao diện khách sẽ thấy của mẫu đang chọn
// ---------------------------------------------------------------------------
function CompactPhonePreview({
  templateId,
  products,
  displayFields,
}: {
  templateId: GreetingTemplateId
  products: GreetingCatalogProduct[]
  displayFields: readonly OptionalDisplayField[]
}) {
  // Frame chrome dimensions derived from constants
  const frameW = PHONE_INNER_W + 16   // 8px padding each side
  const frameH = PHONE_INNER_H + 54   // notch (24) + screen + indicator (14) + padding (16)

  return (
    <div
      style={{
        width: frameW,
        height: frameH,
        borderRadius: 28,
        padding: "0 8px 12px 8px",
        background: "linear-gradient(160deg, #2a2a2e 0%, #18181b 100%)",
        boxShadow:
          "0 0 0 1.5px rgba(255,255,255,0.10), 0 24px 60px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.12)",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Notch */}
      <div
        style={{
          width: 60, height: 14,
          background: "#18181b",
          borderRadius: "0 0 10px 10px",
          margin: "0 auto 4px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
        }}
      >
        <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#333" }} />
        <div style={{ width: 22, height: 3, borderRadius: 3, background: "#2a2a2a" }} />
      </div>

      {/* Screen — clips the scaled card */}
      <div
        style={{
          width: PHONE_INNER_W,
          height: PHONE_INNER_H,
          borderRadius: 18,
          overflow: "hidden",
          position: "relative",
          flex: 1,
        }}
      >
        {/* Scale container — keeps the card at natural width but renders small */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: CARD_NATURAL_W,
            height: CARD_NATURAL_H,
            transformOrigin: "top left",
            transform: `scale(${CARD_SCALE})`,
            pointerEvents: "none", // preview only — no interaction needed
          }}
        >
          <GreetingTemplateRenderer
            embedded
            displayFields={displayFields}
            templateId={templateId}
            products={products}
            catalogName="Bộ sưu tập của tiệm"
            selectedProductId={null}
            onSelectProduct={() => {}}
          />
        </div>
      </div>

      {/* Home indicator */}
      <div
        style={{ width: 50, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.18)", margin: "6px auto 0" }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Left panel list item
// ---------------------------------------------------------------------------
function TemplateListItem({
  tpl,
  isActive,
  isSelected,
  onClick,
  photo,
}: {
  tpl: (typeof GREETING_TEMPLATE_LIST)[number]
  isActive: boolean
  isSelected: boolean
  onClick: () => void
  photo: string | null
}) {
  const ref = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isActive && ref.current) {
      ref.current.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }
  }, [isActive])

  return (
    <Button variant="ghost"
      ref={ref}
      type="button"
      onClick={onClick}
      className={`text-[length:inherit] h-auto justify-start font-[inherit] w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all duration-150 cursor-pointer ${
        isActive
          ? "bg-primary/10 border border-primary/25 hover:bg-primary/10"
          : "hover:bg-surface-alt border border-transparent"
      }`}
    >
      {/* Thumbnail */}
      <div
        className="shrink-0 rounded-lg overflow-hidden relative"
        style={{ width: 40, height: 52 }}
      >
        <TemplateThumb templateId={tpl.id} photo={photo} />
      </div>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span
            className="text-body-sm font-semibold truncate"
            style={{ color: isActive ? "var(--color-primary, #6366f1)" : undefined }}
          >
            {tpl.name}
          </span>
          {isSelected && <Check size={11} className="shrink-0 text-primary" />}
        </div>
        <p className="text-caption text-text-muted truncate leading-tight mt-0.5">
          {tpl.subtitle}
        </p>
      </div>

      <ChevronRight
        size={13}
        className={`shrink-0 transition-opacity ${isActive ? "opacity-100 text-primary" : "opacity-0"}`}
      />
    </Button>
  )
}

// ---------------------------------------------------------------------------
// Right panel — 2-column layout: phone left, info+CTA right
// ---------------------------------------------------------------------------
function LivePreviewPane({
  tpl,
  products,
  isLoading,
  isRealData,
  isSelected,
  onSelect,
  displayFields,
  onOpenSettings,
  industryKey,
}: {
  tpl: (typeof GREETING_TEMPLATE_LIST)[number]
  products: GreetingCatalogProduct[]
  isLoading: boolean
  isRealData: boolean
  isSelected: boolean
  onSelect: () => void
  displayFields: readonly OptionalDisplayField[]
  onOpenSettings?: (() => void) | undefined
  industryKey?: string | null | undefined
}) {
  const terms = getIndustryTerminology(industryKey)
  const [productIdx, setProductIdx] = useState(0)
  const [prevTplId, setPrevTplId] = useState(tpl.id)
  const [fadeKey, setFadeKey] = useState(0)

  // Đổi mẫu → reset vị trí và chạy lại hiệu ứng (điều chỉnh state trong lúc render)
  if (tpl.id !== prevTplId) {
    setFadeKey((k) => k + 1)
    setPrevTplId(tpl.id)
    setProductIdx(0)
  }

  const safeIdx = productIdx < products.length ? productIdx : 0

  const prev = useCallback(() => {
    setProductIdx((i) => (i - 1 + products.length) % products.length)
  }, [products.length])

  const next = useCallback(() => {
    setProductIdx((i) => (i + 1) % products.length)
  }, [products.length])

  return (
    // 2-column: phone left | nav + CTA right — mobile-first compact
    <div className="flex h-full w-full flex-col items-center gap-4 px-3 py-4 sm:flex-row">

      {/* LEFT: phone preview */}
      <div
        key={fadeKey}
        style={{ animation: "fadeSlideIn 0.18s ease-out both", flexShrink: 0 }}
      >
        {isLoading ? (
          <div
            style={{ width: PHONE_INNER_W + 16, height: PHONE_INNER_H + 54 }}
            className="flex flex-col items-center justify-center gap-2 text-text-muted rounded-2xl bg-surface-alt"
          >
            <div
              className="rounded-full border-2 border-primary/30 border-t-primary animate-spin motion-reduce:animate-none"
              style={{ width: 20, height: 20 }}
            />
          </div>
        ) : (
          <CompactPhonePreview
            templateId={tpl.id}
            products={[...products.slice(safeIdx), ...products.slice(0, safeIdx)]}
            displayFields={displayFields}
          />
        )}
      </div>

      {/* RIGHT: name badge + dot navigator + CTA only */}
      <div className="flex flex-col justify-center gap-4 flex-1 min-w-0">
        {/* Name + style badge */}
        <div className="flex flex-col gap-1">
          <h3 className="text-body font-bold text-text leading-tight">{tpl.name}</h3>
        </div>

        {/* Dot navigator */}
        {products.length > 1 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <Button variant="outline"
                type="button"
                onClick={prev}
                className="px-0 py-0 text-[length:inherit] font-[inherit] gap-0 size-8 sm:size-6 rounded-full border border-border flex items-center justify-center text-text-muted hover:text-text transition-colors cursor-pointer"
                aria-label="Sản phẩm trước"
              >
                <ChevronLeft size={12} />
              </Button>
              <div className="flex items-center gap-1">
                {products.map((_, i) => (
                  <Button variant="ghost"
                    key={i}
                    type="button"
                    onClick={() => setProductIdx(i)}
                    className="px-0 py-0 text-[length:inherit] font-[inherit] gap-0 group flex h-6 min-w-6 items-center justify-center cursor-pointer"
                    aria-label={`Sản phẩm ${i + 1}`}
                    aria-current={i === safeIdx ? "true" : undefined}
                  ><span className={`rounded-full transition-all ${i === safeIdx ? "bg-primary w-3.5 h-1.5" : "bg-border w-1.5 h-1.5 group-hover:bg-border-focus"}`} /></Button>
                ))}
              </div>
              <Button variant="outline"
                type="button"
                onClick={next}
                className="px-0 py-0 text-[length:inherit] font-[inherit] gap-0 size-8 sm:size-6 rounded-full border border-border flex items-center justify-center text-text-muted hover:text-text transition-colors cursor-pointer"
                aria-label="Sản phẩm tiếp"
              >
                <ChevronRight size={12} />
              </Button>
            </div>
            <p className="text-caption text-text-muted">
              {safeIdx + 1} / {products.length}
              {isRealData ? <span className="text-primary font-semibold"> · Thật</span> : <span className="block text-text-muted">Ảnh minh hoạ — thêm {terms.sampleProduct.toLowerCase()} để xem ảnh thật</span>}
            </p>
          </div>
        )}

        {onOpenSettings && (
          <Button variant="ghost"
            type="button"
            onClick={onOpenSettings}
            className="h-auto p-0 inline-flex items-center gap-1.5 self-start text-body-sm font-semibold text-primary hover:underline"
          >
            <Settings2 size={14} aria-hidden="true" />
            Thông tin hiển thị
          </Button>
        )}

        {/* CTA */}
        {isSelected ? (
          <div className="w-full py-2 px-3 rounded-xl text-body-sm font-bold flex items-center justify-center gap-1.5 border border-primary/30 bg-primary/10 text-primary">
            <Check size={13} />
            <span>Đang dùng</span>
          </div>
        ) : (
          <Button variant="primary"
            type="button"
            onClick={onSelect}
            className="h-auto w-full py-2 px-3 rounded-xl text-body-sm font-bold flex items-center justify-center gap-1.5 bg-primary text-white hover:bg-primary-dark shadow-sm transition-colors cursor-pointer"
          >
            <Sparkles size={13} />
            <span>Chọn mẫu</span>
          </Button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main exported component
// ---------------------------------------------------------------------------
export function TemplateSelectorSplitPane({
  selectedTemplateId,
  onSelectTemplate,
  catalogId,
  previewProducts,
  displaySettings,
  onOpenDisplaySettings,
  industryKey,
}: TemplateSelectorSplitPaneProps) {
  const templateList = getIndustryGreetingTemplateList(industryKey)
  const [activeId, setActiveId] = useState<GreetingTemplateId>(selectedTemplateId)
  const [activeFilter, setActiveFilter] = useState<"all" | "swipe-style" | "interactive-deck">("swipe-style")

  const { products, isLoading, isRealData } = useCatalogProducts(catalogId, previewProducts)

  const [syncedSelectedId, setSyncedSelectedId] = useState(selectedTemplateId)
  if (syncedSelectedId !== selectedTemplateId) {
    setSyncedSelectedId(selectedTemplateId)
    setActiveId(selectedTemplateId)
  }

  const swipeStyles = templateList.filter((t) => t.category === "swipe-style" && t.styleNumber)
  const auxDecks = templateList.filter((t) => t.category !== "swipe-style" || !t.styleNumber)

  const displayed =
    activeFilter === "swipe-style"
      ? swipeStyles
      : activeFilter === "interactive-deck"
        ? auxDecks
        : templateList

  const activeTpl = templateList.find((t) => t.id === activeId) ?? templateList[0]!

  return (
    <>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div className="space-y-3">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white text-caption font-bold shadow-xs mt-0.5">
              2
            </span>
            <div>
              <label className="text-body-sm font-extrabold text-text flex items-center gap-1.5">
                <Layers size={15} className="text-primary" />
                <span>Giao diện khách xem</span>
              </label>
              <p className="text-caption text-text-muted mt-0.5">
                Bấm một mẫu để xem trước, rồi bấm “Chọn mẫu” để áp dụng cho bộ sưu tập
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 bg-surface-alt rounded-xl self-start sm:self-auto shrink-0">
            {(
              [
                ["swipe-style", "12 Vuốt Thẻ"],
                ["interactive-deck", "Bổ Trợ"],
                ["all", "Tất cả"],
              ] as const
            ).map(([val, label]) => (
              <Button variant="ghost"
                key={val}
                type="button"
                onClick={() => setActiveFilter(val)}
                className={`h-auto gap-0 px-2.5 py-1 rounded-lg text-caption font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  activeFilter === val
                    ? "bg-surface text-text shadow-2xs hover:bg-surface"
                    : "text-text-muted hover:text-text"
                }`}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Split Pane — fixed height, both panels scroll internally */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface sm:h-[var(--panel-h)] sm:flex-row" style={{ "--panel-h": `${PANEL_H}px` } as React.CSSProperties}>
          {/* LEFT: scrollable template list */}
          <div className="max-h-56 w-full shrink-0 overflow-y-auto border-b border-border sm:max-h-none sm:w-64 sm:border-b-0 sm:border-r">
            <div className="p-1.5 space-y-0.5">
              {displayed.map((tpl) => (
                <TemplateListItem
                  key={tpl.id}
                  tpl={tpl}
                  isActive={activeId === tpl.id}
                  isSelected={selectedTemplateId === tpl.id}
                  photo={products[0]?.imageUrl ?? driveThumbProxySrc(products[0]?.driveLink)}
                  onClick={() => setActiveId(tpl.id)}
                />
              ))}
            </div>
          </div>

          {/* RIGHT: live preview — fills remaining width, fixed height */}
          <div className="flex-1 overflow-hidden bg-surface-alt/40">
            {activeTpl && (
              <LivePreviewPane
                tpl={activeTpl}
                products={products}
                isLoading={isLoading}
                isRealData={isRealData}
                isSelected={selectedTemplateId === activeTpl.id}
                onSelect={() => onSelectTemplate(activeTpl.id)}
                displayFields={enabledFieldsFor(displaySettings ?? {}, activeTpl.id)}
                onOpenSettings={onOpenDisplaySettings ? () => onOpenDisplaySettings(activeTpl.id) : undefined}
                industryKey={industryKey}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
