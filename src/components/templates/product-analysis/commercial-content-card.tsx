"use client"

import React from "react"
import { ArrowLeft } from "@/components/ui/icon-set/arrow-left"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ResultCard, type ResultField, type ResultFieldItem, type JudgmentState } from "@/components/result/result-card"
import { useI18n } from "@/lib/i18n"

export interface CommercialContentCardProps {
  fields: ResultField[]
  imageUrl?: string | null | undefined
  judgment?: JudgmentState | undefined
  qualityScore?: number | undefined
  qualityLabel?: string | undefined
  isSaved?: boolean | undefined
  disabled?: boolean | undefined
  onBackToLibrary?: (() => void) | undefined
  onSaveDraft?: (() => void) | undefined
  onReject?: (() => void) | undefined
  onApprove?: (() => void) | undefined
  onFieldChange?: ((key: string, value: string | number | string[]) => void) | undefined
  onFieldAdd?: ((key: string, item: ResultFieldItem) => void) | undefined
  onFieldRemove?: ((key: string, itemId: string) => void) | undefined
  onItemChange?: ((key: string, itemId: string, item: ResultFieldItem) => void) | undefined
}

/**
 * CommercialContentCard (Thẻ nội dung bán hàng M01b)
 *
 * Chuẩn hóa template hiển thị và tinh chỉnh dữ liệu thương mại AI sinh ra:
 * - Tên thương mại gợi ý
 * - Câu chuyện sản phẩm & mô tả cảm xúc
 * - Dịp tặng hoa phù hợp (sinh nhật, khai trương, kỷ niệm...)
 * - Phân khúc giá & thẻ tìm kiếm SEO
 * - Tác vụ đẩy vào Product Master chính thức
 */
export function CommercialContentCard({
  fields,
  imageUrl,
  judgment = "safe",
  qualityScore = 89,
  qualityLabel = "Nội dung phù hợp giọng thương hiệu",
  isSaved = false,
  disabled = false,
  onBackToLibrary,
  onSaveDraft,
  onReject,
  onApprove,
  onFieldChange,
  onFieldAdd,
  onFieldRemove,
  onItemChange,
}: CommercialContentCardProps) {
  const { ti } = useI18n()
  const images = imageUrl ? [{ src: imageUrl, alt: "Ảnh sản phẩm" }] : []

  return (
    <div className="w-full max-w-3xl flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onBackToLibrary && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToLibrary}
              className="flex items-center gap-1.5 text-text-muted hover:text-text transition-colors"
            >
              <ArrowLeft size={14} />
              Kho đã duyệt
            </Button>
          )}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles size={17} strokeWidth={2} />
            </div>
            <div>
              <div className="text-caption font-semibold text-text-muted">Gợi ý tên và câu chuyện cho {ti("sampleProduct") || "sản phẩm"}</div>
              <div className="text-title font-extrabold text-text leading-tight">Bài giới thiệu</div>
            </div>
          </div>
        </div>
        <Badge
          tone={
            isSaved
              ? "success"
              : judgment === "blocked"
              ? "danger"
              : judgment === "warning"
              ? "warning"
              : "neutral"
          }
        >
          {isSaved
            ? "Đã lưu nháp"
            : judgment === "blocked"
            ? "Bị chặn"
            : judgment === "warning"
            ? "Cảnh báo"
            : "An toàn"}
        </Badge>
      </div>

      <ResultCard
        images={images}
        fields={fields}
        judgment={judgment}
        quality={{ score: qualityScore, label: qualityLabel, status: judgment }}
        onSaveDraft={onSaveDraft}
        onReject={onReject}
        onApprove={onApprove}
        onFieldChange={onFieldChange}
        onFieldAdd={onFieldAdd}
        onFieldRemove={onFieldRemove}
        onItemChange={onItemChange}
        disabled={disabled}
      />

      {isSaved && (
        <div className="flex items-center gap-2 rounded-xl bg-success-bg px-4 py-2.5 text-meta font-medium text-secondary-text">
          <CheckCircle2 size={14} strokeWidth={2.2} className="shrink-0" />
          Đã lưu bản nháp bài giới thiệu.
        </div>
      )}
    </div>
  )
}
