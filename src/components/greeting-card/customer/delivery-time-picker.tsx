"use client"

import { NativeSelect } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import React from "react"
import type { ShippingConfig } from "@/modules/greeting-card/domain/brochure-pricing"
import { useI18n } from "@/lib/i18n"
import {
  CUSTOM_TIME_MAX_HOUR,
  CUSTOM_TIME_MIN_HOUR,
  CUSTOM_TIME_PREFIX,
  availableSlots,
  customTimeAvailable,
  customTimeLabel,
  enabledSlots,
  isCustomTimeSlot,
  readyHour,
} from "@/modules/greeting-card/domain/delivery-schedule"

const CUSTOM = "__custom__"
const pad = (n: number) => String(n).padStart(2, "0")

/**
 * Chọn khung giờ giao 2 tiếng (chỉ khung tiệm bật và còn kịp) hoặc "Giờ cụ thể" — khách tự nhập
 * HH:MM. Giá trị lưu: nhãn khung, hoặc `Giờ cụ thể: HH:MM`. Khung đã đủ đơn hiện "đã kín".
 */
export function DeliveryTimePicker({
  id,
  date,
  value,
  shipping,
  fullSlots = [],
  inputClassName,
  onChange,
}: {
  id: string
  date: string
  value: string
  shipping: ShippingConfig
  /** Khung đã đủ đơn (máy chủ báo theo ngày) — hiện "đã kín", không chọn được. */
  fullSlots?: readonly string[]
  inputClassName: string
  onChange: (value: string) => void
}) {
  const { locale } = useI18n()
  const isEn = locale === "en"
  const slots = date ? availableSlots(date, shipping) : enabledSlots(shipping).map((s) => s.label)
  const allowCustom = date ? customTimeAvailable(date, shipping) : shipping.allowCustomTime !== false
  const custom = isCustomTimeSlot(value)
  const customTime = custom ? value.slice(CUSTOM_TIME_PREFIX.length) : ""

  const ready = date ? readyHour(date, shipping) : null
  const minHour = ready != null ? Math.max(CUSTOM_TIME_MIN_HOUR, ready) : CUSTOM_TIME_MIN_HOUR
  const minTimeStr = `${pad(Math.floor(minHour))}:${pad(Math.ceil((minHour % 1) * 60))}`

  return (
    <div className="flex flex-col gap-2">
      <NativeSelect
        id={id}
        value={custom ? CUSTOM : slots.includes(value) ? value : ""}
        onChange={(e) => onChange(e.target.value === CUSTOM ? customTimeLabel("") : e.target.value)}
        className={inputClassName}
      >
        <option value="" disabled>
          {slots.length === 0 && !allowCustom
            ? (isEn ? "No available slots on this date — please choose another date" : "Ngày này không còn khung giờ — chọn ngày khác")
            : (isEn ? "Select delivery time window" : "Chọn khung giờ giao")}
        </option>
        {slots.map((slot) => (
          <option key={slot} value={slot} disabled={fullSlots.includes(slot)}>
            {fullSlots.includes(slot) ? `${slot} (${isEn ? "full" : "đã kín"})` : slot}
          </option>
        ))}
        {allowCustom && (
          <option value={CUSTOM}>
            {isEn ? "Specific time (custom)" : "Giờ cụ thể (tự nhập)"}
          </option>
        )}
      </NativeSelect>
      {custom && (
        <label className="flex items-center gap-2 text-body-sm text-text-muted">
          <span className="shrink-0">{isEn ? "Deliver at" : "Giao lúc"}</span>
          <Input
            type="time"
            aria-label={isEn ? "Specific delivery time" : "Giờ giao cụ thể"}
            min={minTimeStr}
            max={`${pad(CUSTOM_TIME_MAX_HOUR)}:00`}
            step={900}
            value={customTime}
            onChange={(e) => onChange(customTimeLabel(e.target.value))}
            className={inputClassName}
          />
        </label>
      )}
    </div>
  )
}
