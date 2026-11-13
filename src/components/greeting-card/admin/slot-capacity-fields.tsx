"use client"

import { Input } from "@/components/ui/input"
import React from "react"
import { DELIVERY_SLOTS } from "@/modules/greeting-card/domain/delivery-schedule"
import { DEFAULT_SLOT_CAPACITY } from "@/modules/greeting-card/domain/slot-capacity"

const FIELD = "h-9 w-20 px-2 rounded-lg border border-border bg-bg text-body text-text focus:outline-none focus:ring-2 focus:ring-primary/20"

export interface SlotCapacityDraft {
  /** Trần chung (chuỗi đang gõ). */
  all: string
  /** Trần riêng từng khung; bỏ trống = theo trần chung. */
  perSlot: Record<string, string>
}

/**
 * Số đơn tối đa mỗi khung giờ giao (PO 08/10/2026, mặc định 100). Khung đủ đơn: khách thấy "đã kín"
 * và không đặt được; đơn hẹn giờ cụ thể tính vào khung 2 tiếng chứa giờ đó.
 */
export function SlotCapacityFields({ value, onChange }: { value: SlotCapacityDraft; onChange: (next: SlotCapacityDraft) => void }) {
  return (
    <fieldset className="flex flex-col gap-2 border-t border-border pt-3">
      <legend className="text-body-sm font-bold text-text">Số đơn tối đa mỗi khung giờ</legend>
      <label className="flex items-center gap-2 text-body-sm">
        <span className="text-text-muted">Mọi khung giờ:</span>
        <Input
          inputMode="numeric"
          aria-label="Số đơn tối đa mỗi khung giờ"
          value={value.all}
          placeholder={String(DEFAULT_SLOT_CAPACITY)}
          onChange={(e) => onChange({ ...value, all: e.target.value })}
          className={FIELD}
        />
        <span className="text-text-muted">đơn</span>
      </label>
      <div className="flex flex-wrap gap-2">
        {DELIVERY_SLOTS.map((s) => (
          <label key={s.id} className="flex items-center gap-1.5 text-caption text-text-muted">
            <span>{s.label}</span>
            <Input
              inputMode="numeric"
              aria-label={`Số đơn tối đa khung ${s.label}`}
              value={value.perSlot[s.id] ?? ""}
              placeholder={value.all || String(DEFAULT_SLOT_CAPACITY)}
              onChange={(e) => onChange({ ...value, perSlot: { ...value.perSlot, [s.id]: e.target.value } })}
              className={FIELD}
            />
          </label>
        ))}
      </div>
      <p className="text-caption text-text-muted">Bỏ trống ô từng khung = dùng số chung. Khung đủ đơn sẽ hiện “đã kín” với khách.</p>
    </fieldset>
  )
}
