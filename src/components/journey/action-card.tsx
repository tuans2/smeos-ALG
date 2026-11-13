"use client"

import React from "react"
import { COMING_SOON_LABEL } from "@/lib/feature-lock"
import type { JourneyDefinition } from "@/modules/journey/domain/journey-model"
import { IconTile, toneFor } from "@/components/ui/app-icon"
import { InfoTip } from "@/components/ui/info-tip"
import { Button } from "@/components/ui/button"

interface ActionCardProps {
  journey: JourneyDefinition
  onSelect: (journey: JourneyDefinition) => void
  disabled?: boolean
}

/**
 * Thẻ công việc trang chủ — phong cách "Thoáng – Ít chữ – Icon lớn" (OPERATING_PRINCIPLES §6):
 * ô icon đặc lớn, tên việc, mô tả trong "?". Nút chính phủ cả thẻ để không lồng nút trong nút.
 */
export function ActionCard({ journey, onSelect, disabled = false }: ActionCardProps) {
  const badge = disabled ? COMING_SOON_LABEL : journey.badgeText

  return (
    <div
      className={`group relative flex flex-col items-center text-center p-4 pt-6 sm:p-6 rounded-2xl bg-surface shadow-sm ring-1 transition-all ${
        disabled ? "ring-border/40" : "ring-border/60 hover:ring-primary hover:shadow-md"
      }`}
    >
      {badge && (
        <span className="absolute top-2 left-2 sm:top-3 sm:left-3 max-w-[60%] truncate rounded-full bg-surface-alt px-2 py-0.5 text-caption font-semibold text-text-muted">
          {badge}
        </span>
      )}
      <InfoTip label={journey.goal} className="absolute top-1 right-1 z-10 sm:top-3 sm:right-3 m-0">
        {journey.description}
      </InfoTip>

      <IconTile
        name={journey.icon}
        tone={toneFor(journey.id)}
        variant="solid"
        className={`mb-3 sm:mb-4 mt-2 transition-transform ${disabled ? "grayscale opacity-60" : "group-hover:scale-105"}`}
      />

      <h3 className={`text-body-sm sm:text-title-sm font-bold leading-snug ${disabled ? "text-text-muted" : "text-text group-hover:text-primary"}`}>
        <Button
          type="button"
          variant="ghost"
          onClick={() => onSelect(journey)}
          disabled={disabled}
          aria-disabled={disabled || undefined}
          className="after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring cursor-pointer disabled:cursor-not-allowed transition-colors p-0 h-auto font-inherit text-inherit hover:bg-transparent"
        >
          {journey.goal}
        </Button>
      </h3>
      {journey.category === "COMBO" && (
        <span className="mt-1 text-caption text-text-muted">{journey.steps.length} bước</span>
      )}
    </div>
  )
}
