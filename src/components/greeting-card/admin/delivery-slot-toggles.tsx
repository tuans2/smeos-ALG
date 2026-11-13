"use client"

import { Checkbox } from "@/components/ui/checkbox"
import React from "react"
import { CUSTOM_TIME_MAX_HOUR, CUSTOM_TIME_MIN_HOUR, DELIVERY_SLOTS } from "@/modules/greeting-card/domain/delivery-schedule"

/** Bật/tắt từng khung giờ giao 2 tiếng và tuỳ chọn "Giờ cụ thể" khách tự nhập. */
export function DeliverySlotToggles({
  slotIds,
  allowCustomTime,
  onChange,
}: {
  slotIds: string[]
  allowCustomTime: boolean
  onChange: (next: { slotIds: string[]; allowCustomTime: boolean }) => void
}) {
  const toggle = (id: string) => {
    const next = slotIds.includes(id) ? slotIds.filter((x) => x !== id) : [...slotIds, id]
    onChange({ slotIds: DELIVERY_SLOTS.map((s) => s.id).filter((x) => next.includes(x)), allowCustomTime })
  }
  const none = slotIds.length === 0 && !allowCustomTime

  return (
    <fieldset className="flex flex-col gap-2 border-t border-border pt-3">
      <legend className="text-body-sm font-bold text-text">Khung giờ khách được chọn</legend>
      <div className="flex flex-wrap gap-2">
        {DELIVERY_SLOTS.map((s) => (
          <label
            key={s.id}
            className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border text-body-sm cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5"
          >
            <Checkbox checked={slotIds.includes(s.id)} onCheckedChange={() => toggle(s.id)} className="accent-primary" />
            <span>{s.label}</span>
          </label>
        ))}
      </div>
      <label className="flex items-center gap-2 text-body-sm cursor-pointer">
        <Checkbox
          checked={allowCustomTime}
          onCheckedChange={(checked) => onChange({ slotIds, allowCustomTime: (checked === true) })}
          className="accent-primary"
        />
        <span>
          Cho khách nhập <strong>giờ cụ thể</strong> (từ {String(CUSTOM_TIME_MIN_HOUR).padStart(2, "0")}:00 đến {CUSTOM_TIME_MAX_HOUR}:00)
        </span>
      </label>
      {none && (
        <p role="alert" className="text-caption text-danger">Cần bật ít nhất một khung giờ hoặc cho nhập giờ cụ thể.</p>
      )}
    </fieldset>
  )
}
