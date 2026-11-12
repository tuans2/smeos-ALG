"use client"

import React, { useState, useEffect } from "react"
import { Download } from "@/components/ui/icon-set/download"
import { SlidersHorizontal } from "@/components/ui/icon-set/sliders-horizontal"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Camera } from "@/components/ui/icon-set/camera"
import { Coffee } from "@/components/ui/icon-set/coffee"
import { Image as ImageIcon } from "@/components/ui/icon-set/image"
import { Check } from "@/components/ui/icon-set/check"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface BeforeAfterPreviewCardProps {
  originalImageUrl?: string | null | undefined
  enhancedImageUrl?: string | null | undefined
  variantUrls?: {
    studio?: string | null
    lifestyle?: string | null
    bokeh?: string | null
  } | undefined
  variantRatioUrls?: Record<string, Record<string, string>> | undefined
  aspectRatio?: "1:1" | "4:5" | "9:16" | "16:9" | undefined
  availableRatios?: string[] | undefined
  onRatioChange?: ((ratio: "1:1" | "4:5" | "9:16" | "16:9") => void) | undefined
  title?: string | undefined
  presetName?: string | undefined
  presetTone?: "success" | "warning" | "danger" | "neutral" | undefined
  isRejected?: boolean | undefined
  onDownload?: (() => void) | undefined
  onApplyVariant?: (() => void) | undefined
  onSelectVariant?: ((variant: "studio" | "lifestyle" | "bokeh") => void) | undefined
}

export type PreviewMode = "studio" | "lifestyle" | "bokeh" | "original"

/**
 * BeforeAfterPreviewCard (Thẻ so sánh ảnh gốc & trực quan 3 phương án tối ưu M04a)
 */
export function BeforeAfterPreviewCard({
  originalImageUrl,
  enhancedImageUrl,
  variantUrls,
  variantRatioUrls,
  aspectRatio = "1:1",
  availableRatios = ["1:1", "4:5", "9:16", "16:9"],
  onRatioChange,
  title = "So sánh hoàn thiện Studio",
  presetName = "Identity Guard Đạt chuẩn",
  presetTone,
  isRejected = false,
  onDownload,
  onApplyVariant,
  onSelectVariant,
}: BeforeAfterPreviewCardProps) {
  const hasVariants = Boolean(
    variantUrls && (variantUrls.studio || variantUrls.lifestyle || variantUrls.bokeh)
  )

  const [activeMode, setActiveMode] = useState<PreviewMode>(
    isRejected ? "original" : "studio"
  )

  useEffect(() => {
    if (isRejected) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- chuyển chế độ xem theo phán quyết cổng kiểm, chủ đích
      setActiveMode("original")
    } else if (hasVariants) {
      setActiveMode("studio")
    }
  }, [isRejected, hasVariants])

  // Xác định URL ảnh tương ứng với chế độ và tỷ lệ đang chọn
  const getCurrentImage = () => {
    if (activeMode === "original") {
      return originalImageUrl
    }
    // Ưu tiên cao nhất: Bản Smart Reframe chuẩn theo biến thể & tỷ lệ (P1, P2, P3)
    if (variantRatioUrls?.[activeMode]?.[aspectRatio]) {
      return variantRatioUrls[activeMode][aspectRatio]
    }
    if (activeMode === "studio") {
      return variantUrls?.studio || enhancedImageUrl
    }
    if (activeMode === "lifestyle") {
      return variantUrls?.lifestyle || originalImageUrl
    }
    if (activeMode === "bokeh") {
      return variantUrls?.bokeh || enhancedImageUrl
    }
    return enhancedImageUrl || originalImageUrl
  }

  const currentImage = getCurrentImage()
  const badgeTone = presetTone || (isRejected ? "danger" : "success")

  const ratioContainerStyle = {
    "1:1": "aspect-[1/1] max-w-md",
    "4:5": "aspect-[4/5] max-w-[360px]",
    "9:16": "aspect-[9/16] max-w-[280px]",
    "16:9": "aspect-[16/9] max-w-xl",
  }[aspectRatio] || "aspect-[1/1] max-w-md"

  // Mô tả nhanh từng phương án để người dùng dễ quan sát bằng mắt
  const VARIANT_DESCRIPTIONS: Record<PreviewMode, { title: string; desc: string; icon: React.ElementType }> = {
    studio: {
      title: "P.Án 1: Studio Cao Cấp",
      desc: "Light Wrap 3px tràn sáng viền chủ thể, làm mềm viền quang học 1.2px và đổ bóng tiếp xúc 2 tầng.",
      icon: Sparkles,
    },
    lifestyle: {
      title: "P.Án 2: Ảnh Mộc Chân Thực",
      desc: "Giữ 100% rèm cửa và ánh sáng phòng gốc, xóa sạch 100% con dấu và chữ ký. Tự nhiên tuyệt đối.",
      icon: Camera,
    },
    bokeh: {
      title: "P.Án 3: Không Gian Bokeh",
      desc: "Xóa phông không gian f/1.8 với đốm sáng bokeh ấm áp, ánh sáng xiên nghệ thuật.",
      icon: Coffee,
    },
    original: {
      title: "Ảnh Gốc Chụp Xưởng",
      desc: "Ảnh ban đầu chưa qua xử lý, còn nguyên tem nhãn, hotline và chữ ký.",
      icon: ImageIcon,
    },
  }

  const currentVariantInfo = VARIANT_DESCRIPTIONS[activeMode]
  const VariantIcon = currentVariantInfo.icon

  return (
    <Card className="overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-sm flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-caption font-semibold text-text-muted">Tối ưu ảnh Studio Preview</div>
          <div className="text-title font-extrabold text-text">{title}</div>
        </div>
        <Badge tone={badgeTone} className="gap-1">
          <Sparkles size={12} />
          {presetName}
        </Badge>
      </div>

      {/* Thanh chọn trực quan 4 Tab so sánh bằng mắt - Luôn hiển thị đầy đủ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 bg-surface-alt rounded-xl border border-border">
        <Button variant="ghost"
          type="button"
          onClick={() => {
            setActiveMode("studio")
            onSelectVariant?.("studio")
          }}
          className={`h-auto flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-caption font-bold transition-all cursor-pointer ${
            activeMode === "studio"
              ? "bg-surface text-primary border border-primary/25 shadow-sm hover:bg-surface"
              : "text-text-muted hover:text-text hover:bg-surface/60"
          }`}
        >
          <Sparkles size={13} className={activeMode === "studio" ? "text-primary" : "text-text-muted"} />
          ✨ Studio
        </Button>
        <Button variant="ghost"
          type="button"
          onClick={() => {
            setActiveMode("lifestyle")
            onSelectVariant?.("lifestyle")
          }}
          className={`h-auto flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-caption font-bold transition-all cursor-pointer ${
            activeMode === "lifestyle"
              ? "bg-surface text-secondary-text border border-secondary/30 shadow-sm hover:bg-surface"
              : "text-text-muted hover:text-text hover:bg-surface/60"
          }`}
        >
          <Camera size={13} className={activeMode === "lifestyle" ? "text-secondary-text" : "text-text-muted"} />
          🌿 Ảnh Mộc
        </Button>
        <Button variant="ghost"
          type="button"
          onClick={() => {
            setActiveMode("bokeh")
            onSelectVariant?.("bokeh")
          }}
          className={`h-auto flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-caption font-bold transition-all cursor-pointer ${
            activeMode === "bokeh"
              ? "bg-surface text-warning-text border border-warning/30 shadow-sm hover:bg-surface"
              : "text-text-muted hover:text-text hover:bg-surface/60"
          }`}
        >
          <Coffee size={13} className={activeMode === "bokeh" ? "text-warning-text" : "text-text-muted"} />
          ☕ Bokeh
        </Button>
        <Button variant="ghost"
          type="button"
          onClick={() => setActiveMode("original")}
          className={`h-auto flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-caption font-bold transition-all cursor-pointer ${
            activeMode === "original"
              ? "bg-surface text-text border border-border shadow-sm hover:bg-surface"
              : "text-text-muted hover:text-text hover:bg-surface/60"
          }`}
        >
          <ImageIcon size={13} className="text-text-muted" />
          📷 Ảnh Gốc
        </Button>
      </div>

      {/* Chú giải nhanh phương án đang xem */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-alt/70 border border-border text-caption">
        <VariantIcon className="h-4 w-4 text-primary flex-shrink-0" />
        <span className="font-bold text-text flex-shrink-0">
          {currentVariantInfo.title}:
        </span>
        <span className="text-text-muted leading-tight">
          {currentVariantInfo.desc}
        </span>
      </div>

      {/* Vùng hiển thị ảnh */}
      <div className={`relative ${ratioContainerStyle} w-full mx-auto overflow-hidden rounded-xl border border-border bg-surface-alt/60 flex items-center justify-center transition-all duration-300 shadow-inner`}>
        {currentImage ? (
          <img
            key={`${activeMode}-${aspectRatio}-${currentImage}`}
            src={currentImage}
            alt={currentVariantInfo.title}
            className={`h-full w-full ${activeMode === "original" ? "object-contain bg-surface-alt" : "object-cover"} transition-all duration-300`}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-text-muted">
            {isRejected ? (
              <>
                <Sparkles size={32} className="text-danger opacity-60" />
                <span className="text-caption font-bold text-danger">Ảnh AI bị từ chối — Chuyển sang xem &quot;Ảnh gốc&quot;</span>
              </>
            ) : (
              <>
                <Sparkles size={32} className="opacity-40" />
                <span className="text-caption">Đang nạp ảnh xem trước...</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Selector tỷ lệ Smart Reframe nếu có */}
      {availableRatios.length > 0 && onRatioChange && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <span className="text-caption font-medium text-text-muted">Tỷ lệ:</span>
          <div className="flex gap-1">
            {(["1:1", "4:5", "9:16", "16:9"] as const).map((r) => (
              <Button variant="outline"
                type="button"
                key={r}
                onClick={() => onRatioChange(r)}
                className={`h-auto gap-0 px-2.5 py-1 text-caption font-bold rounded-lg border transition cursor-pointer ${
                  aspectRatio === r
                    ? "border-primary bg-primary/10 text-primary hover:bg-primary/10"
                    : "border-border text-text-muted hover:border-text-muted"
                }`}
              >
                {r}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <div className="text-caption text-text-muted">
          Đang xem: <strong className="text-text font-semibold">{currentVariantInfo.title}</strong> • Tỷ lệ: {aspectRatio}
        </div>
        <div className="flex items-center gap-2">
          {onApplyVariant && (
            <Button variant="secondary" size="sm" onClick={onApplyVariant} className="gap-1.5">
              <SlidersHorizontal size={14} />
              Đổi bối cảnh
            </Button>
          )}
          {onDownload && (
            <Button size="sm" onClick={onDownload} className="gap-1.5">
              <Download size={14} />
              Tải ảnh ({aspectRatio})
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

