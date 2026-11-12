"use client"

import React, { useRef } from "react"
import { UploadCloud } from "@/components/ui/icon-set/upload-cloud"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { LayoutGrid } from "@/components/ui/icon-set/layout-grid"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Zap } from "@/components/ui/icon-set/zap"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/select"
import { getIndustryPlugin } from "@/modules/organization/domain/industry-profile"

export type GenerationEngine = "TEMPLATE_ENGINE" | "AI_PROVIDER"

export interface AutoGeneratePanelProps {
  readonly industryKey: string
  readonly occasionKey: string
  readonly occasionLabel: string
  readonly onOccasionChange: (key: string, label: string) => void
  readonly productImageUrl?: string | undefined
  readonly onProductImageChange: (url: string) => void
  readonly generationEngine: GenerationEngine
  readonly onEngineChange: (engine: GenerationEngine) => void
  readonly onTriggerAutoGenerate: () => Promise<void>
  readonly isGenerating: boolean
  readonly onOpenTemplateGallery: () => void
}

const PURPOSE_QUICK_TAGS = [
  { key: "OPENING", label: "Khai trương hồng phát" },
  { key: "FLASH_SALE", label: "Flash Sale / Giảm sốc" },
  { key: "NEW_ARRIVAL", label: "Mẫu mới ra mắt" },
  { key: "WOMEN_DAY", label: "Ngày lễ 20/10 & 8/3" },
] as const

export function AutoGeneratePanel({
  industryKey,
  occasionKey,
  onOccasionChange,
  productImageUrl,
  onProductImageChange,
  generationEngine,
  onEngineChange,
  onTriggerAutoGenerate,
  isGenerating,
  onOpenTemplateGallery,
}: AutoGeneratePanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const plugin = getIndustryPlugin(industryKey)
  const occasions = plugin.taxonomy.occasions || []

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          onProductImageChange(String(event.target.result))
        }
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="space-y-4">
      {/* ── 1. KHU VỰC TẢI ẢNH SẢN PHẨM (DROPZONE) ────────────────────── */}
      <div className="space-y-1.5">
        <label className="text-caption font-bold text-text flex items-center justify-between">
          <span>1. Tải ảnh sản phẩm của bạn</span>
          <span className="text-caption text-primary font-normal">
            Bắt buộc để tạo poster
          </span>
        </label>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        <Button variant="ghost"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`text-[length:inherit] h-auto font-[inherit] gap-0 block w-full relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
            productImageUrl
              ? "border-primary/50 bg-primary/5 hover:bg-primary/5"
              : "border-border hover:border-primary hover:bg-surface-alt"
          }`}
        >
          {productImageUrl ? (
            <div className="flex items-center justify-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={productImageUrl}
                alt="Product Preview"
                className="h-16 w-16 object-contain rounded-lg border border-border bg-white shadow-sm"
              />
              <div className="text-left">
                <span className="text-caption font-bold text-text flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Đã nạp ảnh thành công
                </span>
                <span className="block text-caption text-text-muted mt-0.5">
                  Nhấp để chọn ảnh khác từ máy tính
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
                <UploadCloud className="h-5 w-5" />
              </div>
              <span className="text-caption font-bold text-text">
                Kéo thả hoặc nhấp để chọn ảnh sản phẩm từ máy
              </span>
              <span className="block text-caption text-text-muted mt-0.5">
                Hỗ trợ PNG, JPG, WebP chất lượng cao
              </span>
            </div>
          )}
        </Button>

      </div>

      {/* ── 2. CHỌN MỤC ĐÍCH / DỊP CHIẾN DỊCH ────────────────────────── */}
      <div className="space-y-2 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <label className="text-caption font-bold text-text">
            2. Chọn mục đích & dịp quảng cáo
          </label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenTemplateGallery}
            className="gap-1 text-caption font-semibold text-primary h-auto p-0 hover:bg-transparent hover:underline"
          >
            <LayoutGrid className="h-3 w-3" /> Xem Kho Template
          </Button>
        </div>

        {/* Quick Purpose Tags */}
        <div className="grid grid-cols-2 gap-1.5">
          {PURPOSE_QUICK_TAGS.map((tag) => {
            const isSelected = occasionKey === tag.key
            return (
              <Button variant="outline"
                type="button"
                key={tag.key}
                onClick={() => onOccasionChange(tag.key, tag.label.replace(/^[^\s]+\s/, ""))}
                className={`h-auto justify-start gap-0 py-1.5 px-2.5 rounded-lg text-caption font-medium text-left border transition-all truncate cursor-pointer ${
                  isSelected
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-sm hover:bg-primary/10"
                    : "border-border bg-surface hover:bg-surface-alt text-text"
                }`}
              >
                {tag.label}
              </Button>
            )
          })}
        </div>

        {/* Dropdown dịp chi tiết */}
        <div className="mt-1.5">
          <NativeSelect
            aria-label="Dịp cụ thể"
            value={occasionKey}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              const selected = e.target.value
              const found = occasions.find((o) => o.key === selected)
              onOccasionChange(selected, found ? found.label : selected)
            }}
            className="w-full text-caption"
          >
            {occasions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label} {o.suggestedPromotion ? `(${o.suggestedPromotion})` : ""}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {/* ── 3. CHỌN PHƯƠNG THỨC TẠO (ENGINE) ─────────────────────────── */}
      <div className="space-y-2 pt-2 border-t border-border">
        <label className="text-caption font-bold text-text block">
          3. Chọn phương án thực hiện
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Option A: Template Engine */}
          <Button variant="outline"
            type="button"
            onClick={() => onEngineChange("TEMPLATE_ENGINE")}
            aria-pressed={generationEngine === "TEMPLATE_ENGINE"}
            className={`text-[length:inherit] h-auto font-[inherit] gap-0 p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
              generationEngine === "TEMPLATE_ENGINE"
                ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm hover:bg-primary/5"
                : "border-border bg-surface hover:bg-surface-alt"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-caption font-bold text-text flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-warning-text" /> Bố cục Template
                </span>
                <span className="text-caption px-1.5 py-0.2 rounded bg-success-bg text-success-text font-bold">
                  Khuyên dùng
                </span>
              </div>
              <p className="text-caption text-text-muted leading-relaxed">
                Tự động ghép ảnh thật + chữ tiếng Việt sắc nét chuẩn in & mạng xã hội, sửa được từng từ.
              </p>
            </div>
          </Button>

          {/* Option B: Single-Call AI */}
          <Button variant="outline"
            type="button"
            onClick={() => onEngineChange("AI_PROVIDER")}
            aria-pressed={generationEngine === "AI_PROVIDER"}
            className={`text-[length:inherit] h-auto font-[inherit] gap-0 p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
              generationEngine === "AI_PROVIDER"
                ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm hover:bg-primary/5"
                : "border-border bg-surface hover:bg-surface-alt"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-caption font-bold text-text flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> AI vẽ bố cục mới
                </span>
                <span className="text-caption px-1.5 py-0.2 rounded bg-primary/10 text-primary font-bold">
                  Sáng tạo AI
                </span>
              </div>
              <p className="text-caption text-text-muted leading-relaxed">
                AI vẽ bố cục mới từ ảnh và mô tả của bạn trong một lần, có kiểm tra chất lượng tự động.
              </p>
            </div>
          </Button>
        </div>
      </div>

      {/* ── 4. NÚT KÍCH HOẠT TẠO TỰ ĐỘNG (1-CLICK) ───────────────────── */}
      <div className="pt-2">
        <Button
          type="button"
          variant="primary"
          size="lg"
          disabled={isGenerating || !productImageUrl}
          onClick={onTriggerAutoGenerate}
          className="w-full gap-2 text-body-sm font-bold"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
              <span>Đang tự động viết nội dung & dàn 5 kích thước...</span>
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" aria-hidden="true" />
              <span>Tạo bộ poster và banner</span>
            </>
          )}
        </Button>
        {!productImageUrl && (
          <p className="text-caption text-warning-text text-center mt-1.5">
            Hãy tải ảnh sản phẩm lên trước để kích hoạt tạo tự động
          </p>
        )}
      </div>
    </div>
  )
}
