"use client"

import React from "react"
import { ClipboardCheck } from "@/components/ui/icon-set/clipboard-check"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Badge } from "@/components/ui/badge"
import { ResultCard, type ResultField, type ResultFieldItem, type JudgmentState } from "@/components/result/result-card"

export interface AnalysisResultCardProps {
  fields: ResultField[]
  imageUrl?: string | null | undefined
  judgment?: JudgmentState | undefined
  confidence?: number | null | undefined
  qualityLabel?: string | undefined
  isSaved?: boolean | undefined
  disabled?: boolean | undefined
  stepNumber?: string | undefined
  headerTitle?: string | undefined
  onSaveDraft?: (() => void) | undefined
  onReject?: (() => void) | undefined
  onApprove?: (() => void) | undefined
  onFieldChange?: ((key: string, value: string | number | string[]) => void) | undefined
  onFieldAdd?: ((key: string, item: ResultFieldItem) => void) | undefined
  onFieldRemove?: ((key: string, itemId: string) => void) | undefined
  onItemChange?: ((key: string, itemId: string, item: ResultFieldItem) => void) | undefined
}

/**
 * AnalysisResultCard (Thẻ kết quả phân tích cấu phần hoa M01a)
 *
 * Chuẩn hóa template hiển thị kết quả phân tích thị giác AI cho mẫu hoa:
 * - Định lượng cành & chủng loại hoa nguyên tử
 * - Màu sắc chủ đạo & phong cách bó/cắm
 * - Điểm tin cậy thị giác (AI Confidence)
 * - Tác vụ duyệt/từ chối/lưu nháp phân định rõ ràng
 */
export function AnalysisResultCard({
  fields,
  imageUrl,
  judgment = "safe",
  confidence = 94,
  qualityLabel = "Độ tin cậy cao — mọi cấu phần đạt ngưỡng",
  isSaved = false,
  disabled = false,
  stepNumber = "④ Thẻ kết quả 1",
  headerTitle = "Đặc điểm nhận diện",
  onSaveDraft,
  onReject,
  onApprove,
  onFieldChange,
  onFieldAdd,
  onFieldRemove,
  onItemChange,
}: AnalysisResultCardProps) {
  const images = imageUrl ? [{ src: imageUrl, alt: "Ảnh sản phẩm nhận diện" }] : []

  return (
    <div className="w-full max-w-3xl flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ClipboardCheck size={17} strokeWidth={2} />
          </div>
          <div>
            <div className="text-caption font-semibold text-text-muted">{stepNumber}</div>
            <div className="text-title font-extrabold text-text leading-tight">{headerTitle}</div>
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
        quality={{
          score: typeof confidence === "number" ? confidence : 94,
          label: qualityLabel,
          status: judgment,
        }}
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
          Đã lưu nháp — quay lại trang này để tiếp tục chỉnh sửa.
        </div>
      )}
    </div>
  )
}
