"use client"

import { Button } from "@/components/ui/button"
import React from "react"
import { useI18n } from "@/lib/i18n"
import type { SupportedLocale } from "@/lib/i18n/types"

const LOCALE_META: Record<SupportedLocale, { flag: string; label: string }> = {
  vi: { flag: "🇻🇳", label: "VI" },
  en: { flag: "🇬🇧", label: "EN" },
}

interface LanguageToggleProps {
  activeLocales?: SupportedLocale[] | undefined
  className?: string
}

/**
 * Nút chuyển đổi ngôn ngữ dạng pill hiển thị tất cả locale đang kích hoạt.
 * Chỉ render khi có ≥ 2 locale. Hiển thị rõ cả 2 lựa chọn để khách quốc tế dễ nhận ra.
 */
export function LanguageToggle({ activeLocales = ["vi", "en"], className = "" }: LanguageToggleProps) {
  const { locale, setLocale } = useI18n()

  if (activeLocales.length <= 1) return null

  return (
    <div
      role="group"
      aria-label="Chọn ngôn ngữ"
      className={`inline-flex items-center rounded-full border border-border bg-surface shadow-xs overflow-hidden ${className}`}
    >
      {activeLocales.map((loc) => {
        const meta = LOCALE_META[loc]
        const isActive = locale === loc
        return (
          <Button variant="ghost"
            key={loc}
            type="button"
            onClick={() => setLocale(loc)}
            aria-label={`Xem bằng ${loc === "vi" ? "Tiếng Việt" : "English"}`}
            aria-pressed={isActive}
            className={`py-0 inline-flex items-center gap-1 h-9 px-2.5 text-caption font-black uppercase tracking-wide transition-all ${
              isActive
                ? "bg-primary text-white hover:bg-primary"
                : "text-text-muted hover:bg-surface-alt hover:text-text"
            }`}
          >
            <span className="text-title-sm leading-none">{meta.flag}</span>
            <span>{meta.label}</span>
          </Button>
        )
      })}
    </div>
  )
}
