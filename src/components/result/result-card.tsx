"use client"

import { useState } from "react"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { ChevronDown } from "@/components/ui/icon-set/chevron-down"
import { ChevronUp } from "@/components/ui/icon-set/chevron-up"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FieldCard, type ResultField, type ResultFieldItem } from "./field-card"

export type { ResultField, ResultFieldItem }
export type JudgmentState = "safe" | "warning" | "blocked"

export interface ResultImage {
  src: string
  alt: string
  isBefore?: boolean
  isAfter?: boolean
}

export interface QualityIndicator {
  score: number | null
  label: string
  status: JudgmentState
}

export interface ResultCardProps {
  images?: ResultImage[] | undefined
  beforeAfter?: { beforeSrc: string; afterSrc: string; caption?: string } | undefined
  fields: ResultField[]
  quality?: QualityIndicator | undefined
  judgment: JudgmentState
  onSaveDraft?: (() => void) | undefined
  onReject?: (() => void) | undefined
  onApprove?: (() => void) | undefined
  onRunAgain?: (() => void) | undefined
  onSkip?: (() => void) | undefined
  onFieldChange?: ((key: string, value: string | number | string[]) => void) | undefined
  onFieldAdd?: ((key: string, item: ResultFieldItem) => void) | undefined
  onFieldRemove?: ((key: string, itemId: string) => void) | undefined
  onItemChange?: ((key: string, itemId: string, item: ResultFieldItem) => void) | undefined
  disabled?: boolean | undefined
}

const L0_FIELD_KEYS = new Set([
  "category",
  "product_name",
  "name",
  "flowers",
  "totals",
  "palette_accounting",
  "tones",
  "phong_cach",
  "style",
])

export function ResultCard({
  images,
  beforeAfter,
  fields,
  quality,
  judgment,
  onSaveDraft,
  onReject,
  onApprove,
  onRunAgain,
  onSkip,
  onFieldChange,
  onFieldAdd,
  onFieldRemove,
  onItemChange,
  disabled,
}: ResultCardProps) {
  const [expandedQuality, setExpandedQuality] = useState(false)

  const judgmentMeta = {
    safe: {
      badge: "bg-success-bg text-secondary",
      label: "An toàn",
      dot: "bg-secondary",
    },
    warning: {
      badge: "bg-warning-bg text-warning-text",
      label: "Cảnh báo",
      dot: "bg-warning",
    },
    blocked: {
      badge: "bg-danger-bg text-danger",
      label: "Bị chặn",
      dot: "bg-danger",
    },
  }
  const meta = judgmentMeta[judgment]

  const approveBlocked = judgment === "blocked"

  const [showDetails, setShowDetails] = useState(false)
  const l0Fields = fields.filter((f) => L0_FIELD_KEYS.has(f.key))
  const detailFields = fields.filter((f) => !L0_FIELD_KEYS.has(f.key))
  const visibleFields =
    l0Fields.length > 0 && detailFields.length > 0
      ? showDetails
        ? fields
        : l0Fields
      : fields

  return (
    <Card className="flex flex-col gap-3 border-border">
      {/* Zone 1: Illustration */}
      {beforeAfter && (
        <div className="flex gap-2 overflow-hidden rounded-xl">
          <div className="relative flex-1 aspect-[4/3] overflow-hidden rounded-xl bg-surface-alt">
            <img
              src={beforeAfter.beforeSrc}
              alt="Trước"
              className="h-full w-full object-cover"
            />
            <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-caption font-bold text-white">
              Trước
            </span>
          </div>
          <div className="relative flex-1 aspect-[4/3] overflow-hidden rounded-xl bg-surface-alt">
            <img
              src={beforeAfter.afterSrc}
              alt="Sau"
              className="h-full w-full object-cover"
            />
            <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-caption font-bold text-white">
              Sau
            </span>
            {beforeAfter.caption && (
              <span className="absolute bottom-2 left-2 right-2 rounded-lg bg-black/60 px-2 py-1 text-caption text-white text-center">
                {beforeAfter.caption}
              </span>
            )}
          </div>
        </div>
      )}

      {images && images.length > 0 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1">
          {images.map((img, i) => (
            <div key={i} className="relative h-48 w-48 sm:h-56 sm:w-56 flex-shrink-0 overflow-hidden rounded-2xl bg-surface-alt border border-border shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.src} alt={img.alt} className="h-full w-full object-cover" />
              {img.isBefore && (
                <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-caption font-bold text-white">
                  Trước
                </span>
              )}
              {img.isAfter && (
                <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-caption font-bold text-white">
                  Sau
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Zone 2: Data fields */}
      <div className="flex flex-col divide-y divide-border">
        {visibleFields.map((field) => (
          <FieldCard
            key={field.key}
            field={field}
            editable={field.editable && !disabled}
            {...(onFieldChange ? { onFieldChange } : {})}
            {...(onFieldAdd ? { onFieldAdd } : {})}
            {...(onFieldRemove ? { onFieldRemove } : {})}
            {...(onItemChange ? { onItemChange } : {})}
          />
        ))}
        {l0Fields.length > 0 && detailFields.length > 0 && (
          <div className="pt-2 pb-1 text-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="inline-flex min-h-11 items-center gap-1.5 px-3 py-1.5 text-body-sm font-semibold text-primary hover:underline"
            >
              {showDetails ? (
                <>
                  Thu gọn cấu phần chi tiết
                  <ChevronUp size={15} aria-hidden="true" />
                </>
              ) : (
                <>
                  Xem chi tiết cấu phần ({detailFields.length} trường khác)
                  <ChevronDown size={15} aria-hidden="true" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Zone 3: Quality indicators */}
      {quality && (
        <div>
          <Button variant="ghost"
            type="button"
            onClick={() => setExpandedQuality(!expandedQuality)}
            className="text-[length:inherit] h-auto font-[inherit] gap-0 flex w-full cursor-pointer items-center justify-between rounded-lg bg-surface-alt px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary hover:bg-surface-alt"
          >
            <span className="flex items-center gap-2 text-body-sm font-bold text-text">
              <span className={cn("h-2 w-2 flex-shrink-0 rounded-full", meta.dot)} />
              Chất lượng: {quality.label}
              <Badge className={cn("text-caption", meta.badge)}>{meta.label}</Badge>
            </span>
            {expandedQuality ? (
              <ChevronUp size={14} className="text-text-muted" />
            ) : (
              <ChevronDown size={14} className="text-text-muted" />
            )}
          </Button>
          {expandedQuality && (
            <div className="mt-1.5 rounded-lg bg-surface-alt px-3 py-2 text-meta text-text-muted">
              {quality.score != null && (
                <div>
                  Điểm: <span className="font-bold text-text">{quality.score}/100</span>
                </div>
              )}
              <div>{quality.label}</div>
            </div>
          )}
        </div>
      )}

      {/* Zone 4: Actions — K2: Duyệt (primary) + Không đạt (outline) cạnh nhau ở phải; Lưu nháp ở trái */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        {/* Lưu nháp — bên trái */}
        <div>
          {onSaveDraft && (
            <Button variant="ghost" onClick={onSaveDraft} disabled={disabled}>
              Lưu nháp
            </Button>
          )}
        </div>

        {/* Nhóm duyệt — bên phải, luôn cạnh nhau */}
        <div className="flex items-center gap-2">
          {!approveBlocked && onReject && (
            <Button variant="outline" onClick={onReject} disabled={disabled}>
              Không đạt
            </Button>
          )}
          {!approveBlocked && onApprove && (
            <Button onClick={onApprove} disabled={disabled}>
              Duyệt
            </Button>
          )}
          {approveBlocked && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-meta font-medium text-danger">
                <ShieldCheck size={14} strokeWidth={1.8} />
                Kết quả bị chặn — không thể duyệt trực tiếp
              </div>
              <div className="flex gap-2">
                {onRunAgain && (
                  <Button variant="secondary" onClick={onRunAgain} disabled={disabled}>
                    Chạy lại
                  </Button>
                )}
                {onSkip && (
                  <Button variant="ghost" onClick={onSkip} disabled={disabled}>
                    Bỏ qua
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export function WarningBanner({
  message,
  onCancel,
}: {
  message: string
  onConfirm?: () => void
  onCancel?: () => void
}) {
  const [confirmed, setConfirmed] = useState(false)

  return (
    <div className="flex flex-col gap-3 rounded-xl border-[1.5px] border-warning bg-warning-bg p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} strokeWidth={1.8} className="mt-0.5 flex-shrink-0 text-warning-text" />
        <div className="flex-1 text-meta leading-relaxed text-warning-text">{message}</div>
      </div>
      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Hủy
          </Button>
        )}
        <Button
          size="sm"
          onClick={() => setConfirmed(true)}
          className={cn(confirmed && "bg-warning hover:bg-warning/90")}
        >
          {confirmed ? "Vẫn duyệt dù có cảnh báo" : "Duyệt kèm cảnh báo"}
        </Button>
      </div>
    </div>
  )
}
