"use client"

import React, { useState } from "react"
import { ChevronDown } from "@/components/ui/icon-set/chevron-down"
import { Sliders } from "@/components/ui/icon-set/sliders"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BACKGROUND_PRESETS, ASPECT_RATIO_OPTIONS } from "@/modules/product-photo-studio/domain/preset-catalog"

export interface PresetSelectorProps {
  selectedPreset: string
  selectedRatio: string
  customNote: string
  onPresetChange: (presetId: string) => void
  onRatioChange: (ratioId: string) => void
  onCustomNoteChange: (note: string) => void
}

export function PresetSelector({
  selectedPreset,
  selectedRatio,
  customNote,
  onPresetChange,
  onRatioChange,
  onCustomNoteChange,
}: PresetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border border-border rounded-2xl bg-surface shadow-xs overflow-hidden transition-all">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full px-5 py-3.5 h-auto flex items-center justify-between text-left hover:bg-surface-alt/60 transition-colors cursor-pointer rounded-none"
      >
        <div className="flex items-center gap-2.5">
          <Sliders className="w-4 h-4 text-text-muted" />
          <span className="text-body-sm font-semibold text-text">
            Tùy chọn phông nền & tỉ lệ khung hình
          </span>
          <span className="text-caption bg-surface-alt text-text-muted px-2 py-0.5 rounded-full font-medium border border-border">
            Mặc định: Tự động ✨
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </Button>

      {isOpen && (
        <div className="p-5 border-t border-border space-y-5 bg-surface-alt/20">
          <div>
            <label className="block text-caption font-bold text-text uppercase tracking-wider mb-2">
              Phong cách phông nền Studio
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {BACKGROUND_PRESETS.map((p) => {
                const isSelected = selectedPreset === p.id
                return (
                  <Button
                    key={p.id}
                    type="button"
                    variant="ghost"
                    onClick={() => onPresetChange(p.id)}
                    aria-pressed={isSelected}
                    className={`p-3 h-auto rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer whitespace-normal w-full ${
                      isSelected
                        ? "border-primary bg-primary-muted ring-1 ring-primary shadow-xs"
                        : "border-border bg-surface hover:border-primary/40"
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-full border border-border shrink-0 mt-0.5"
                      style={{ backgroundColor: p.colorHex ?? "#f8fafc" }}
                    />
                    <div className="min-w-0">
                      <div className="text-body-sm font-semibold text-text">{p.name}{isSelected && <span className="ml-1 text-primary" aria-hidden="true">✓</span>}</div>
                      <div className="text-caption text-text-muted line-clamp-1">{p.description}</div>
                    </div>
                  </Button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-caption font-bold text-text uppercase tracking-wider mb-2">
              Tỉ lệ khung hình xuất xưởng
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ASPECT_RATIO_OPTIONS.map((r) => {
                const isSelected = selectedRatio === r.id
                return (
                  <Button
                    key={r.id}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRatioChange(r.id)}
                    aria-pressed={isSelected}
                    className={`py-2 px-3 h-auto rounded-xl border text-center transition-all cursor-pointer whitespace-normal ${
                      isSelected
                        ? "border-primary bg-primary-muted font-semibold text-primary ring-1 ring-primary"
                        : "border-border bg-surface text-text hover:border-primary/40 text-caption"
                    }`}
                  >
                    <div className="text-caption font-semibold">{isSelected && <span aria-hidden="true">✓ </span>}{r.label}</div>
                  </Button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-caption font-bold text-text uppercase tracking-wider mb-1.5">
              Ghi chú bổ sung cho trợ lý AI (Tùy chọn)
            </label>
            <Input
              type="text"
              value={customNote}
              onChange={(e) => onCustomNoteChange(e.target.value)}
              placeholder="Ví dụ: làm sáng hơn ở bên phải, nền ánh kem nhẹ ấm áp..."
              className="w-full text-caption h-10"
            />
          </div>
        </div>
      )}
    </div>
  )
}
