"use client"

import { Input } from "@/components/ui/input"
import React from "react"
import { CalendarDays } from "@/components/ui/icons"
import { viDeliveryDate, viShortDate } from "@/modules/greeting-card/domain/delivery-schedule"
import { useI18n } from "@/lib/i18n"

/** "Friday, Oct 16, 2026" cho tiếng Anh */
function enDateDisplay(iso: string, compact?: boolean): string {
  try {
    const d = new Date(`${iso}T00:00:00Z`)
    if (compact) {
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    }
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
  } catch {
    return iso
  }
}

/**
 * Ô chọn ngày hiện kiểu Việt Nam ("Thứ Sáu, 16/10/2026") hoặc tiếng Anh khi locale là EN.
 */
export function ViDateInput({
  id,
  value,
  onChange,
  min,
  max,
  required,
  className,
  wrapperClassName,
  ariaLabel,
  compact,
}: {
  id?: string | undefined
  value: string
  onChange: (value: string) => void
  min?: string | undefined
  max?: string | undefined
  required?: boolean | undefined
  className: string
  /** Kích thước ô trong hàng (vd. `flex-1`, `w-44`) */
  wrapperClassName?: string | undefined
  ariaLabel?: string | undefined
  compact?: boolean | undefined
}) {
  const { locale } = useI18n()
  const isEn = locale === "en"
  const formattedDate = value
    ? isEn
      ? enDateDisplay(value, compact)
      : compact
      ? viShortDate(value)
      : viDeliveryDate(value)
    : isEn
    ? "Select date"
    : "Chọn ngày"

  return (
    <div className={`relative ${wrapperClassName ?? ""}`}>
      <Input
        id={id}
        aria-label={ariaLabel}
        type="date"
        required={required}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        // Máy tính: bấm vào bất kỳ đâu trên ô cũng mở lịch (không chỉ biểu tượng)
        onClick={(e) => {
          try {
            e.currentTarget.showPicker?.()
          } catch {
            /* trình duyệt không hỗ trợ — vẫn chọn được bằng biểu tượng */
          }
        }}
        className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
      />
      <div
        aria-hidden="true"
        className={`${className} flex items-center justify-between gap-2 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/20`}
      >
        <span className={value ? "truncate" : `truncate text-text-muted/70 ${compact ? "" : "text-body"}`}>
          {formattedDate}
        </span>
        <CalendarDays size={compact ? 14 : 18} className="shrink-0 text-text-muted" />
      </div>
    </div>
  )
}
